import dotenv from 'dotenv';
import { ML1Features } from '../types/mlFeatures.types.js';
import {
  MLPredictionResult,
  MLHealthResult,
  isMLPredictionResult,
  isMLHealthResult
} from '../types/prediction.types.js';

dotenv.config();

/**
 * HTTP client for the Phase 5 FastAPI ML1 service.
 *
 * Uses Node's built-in `fetch` (available since Node 18, typed via @types/node),
 * so no new dependency is required. The ML service URL and timeout are read from
 * environment variables and never hardcoded in application logic.
 */

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const ML_SERVICE_TIMEOUT_MS = Number(process.env.ML_SERVICE_TIMEOUT_MS ?? 10000);

/** Raised when the ML service is unreachable, times out, or returns non-2xx. */
export class MLServiceUnavailableError extends Error {
  readonly statusCode = 503;
  constructor(message: string) {
    super(message);
    this.name = 'MLServiceUnavailableError';
  }
}

/** Raised when the ML service returns a payload that does not match its schema. */
export class MLInvalidResponseError extends Error {
  readonly statusCode = 502;
  constructor(message: string) {
    super(message);
    this.name = 'MLInvalidResponseError';
  }
}

export class MLPredictionClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string = ML_SERVICE_URL, timeoutMs: number = ML_SERVICE_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Send the exact ML1 feature payload to FastAPI `POST /predict`.
   * Returns the validated prediction result or throws a typed error.
   */
  async predict(features: ML1Features): Promise<MLPredictionResult> {
    const response = await this.request('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features)
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new MLInvalidResponseError(
        `ML service returned a non-JSON response (HTTP ${response.status}).`
      );
    }

    if (!isMLPredictionResult(body)) {
      throw new MLInvalidResponseError(
        'ML service response did not match the expected prediction schema.'
      );
    }
    return body;
  }

  /** Check the FastAPI `/health` endpoint (used by the backend ML health route). */
  async health(): Promise<MLHealthResult> {
    const response = await this.request('/health');
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new MLInvalidResponseError(
        `ML health check returned a non-JSON response (HTTP ${response.status}).`
      );
    }
    if (!isMLHealthResult(body)) {
      throw new MLInvalidResponseError(
        'ML health check response did not match the expected schema.'
      );
    }
    return body;
  }

  private async request(
    path: string,
    init?: RequestInit
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
      throw new MLServiceUnavailableError(
        timedOut
          ? `ML service timed out after ${this.timeoutMs}ms (${this.baseUrl}${path}).`
          : `ML service is unreachable at ${this.baseUrl}${path}.`
      );
    }

    if (!response.ok) {
      throw new MLServiceUnavailableError(
        `ML service returned HTTP ${response.status} for ${path} on ${this.baseUrl}.`
      );
    }
    return response;
  }
}

export const mlPredictionClient = new MLPredictionClient();

export default mlPredictionClient;