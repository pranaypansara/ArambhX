import dotenv from 'dotenv';
import {
  ML2AnalysisRequest,
  ML2AnalysisResponse,
  isML2AnalysisResponse
} from '../types/ml2.types.js';
import {
  MLServiceUnavailableError,
  MLInvalidResponseError
} from './mlPredictionClient.service.js';

dotenv.config();

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const ML_SERVICE_TIMEOUT_MS = Number(process.env.ML_SERVICE_TIMEOUT_MS ?? 10000);

/**
 * HTTP client for the Phase 8 FastAPI ML2 risk-intelligence endpoint.
 *
 * Reuses the exact `ML_SERVICE_URL` / `ML_SERVICE_TIMEOUT_MS` configuration and
 * the typed error classes defined by the Phase 6 ML1 client so the backend has a
 * single, consistent error model for both ML services. Uses Node's built-in
 * `fetch` (Node 18+), so no new dependency is added.
 */
export class ML2Client {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string = ML_SERVICE_URL, timeoutMs: number = ML_SERVICE_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Send the ML2 risk-analysis payload (features + stored risk history) to
   * FastAPI `POST /ml2/analyze`. Returns the validated ML2 result or throws a
   * typed error.
   */
  async analyze(request: ML2AnalysisRequest): Promise<ML2AnalysisResponse> {
    const response = await this.request('/ml2/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new MLInvalidResponseError(
        `ML2 service returned a non-JSON response (HTTP ${response.status}).`
      );
    }

    if (!isML2AnalysisResponse(body)) {
      throw new MLInvalidResponseError(
        'ML2 service response did not match the expected risk-analysis schema.'
      );
    }
    return body;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
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
          ? `ML2 service timed out after ${this.timeoutMs}ms (${this.baseUrl}${path}).`
          : `ML2 service is unreachable at ${this.baseUrl}${path}.`
      );
    }

    if (!response.ok) {
      throw new MLServiceUnavailableError(
        `ML2 service returned HTTP ${response.status} for ${path} on ${this.baseUrl}.`
      );
    }
    return response;
  }
}

export const ml2Client = new ML2Client();

export default ml2Client;