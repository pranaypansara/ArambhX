/**
 * ML1 prediction result types.
 *
 * These mirror the exact response schema of the Phase 5 FastAPI ML service
 * (`server/ml/service/app/schemas/prediction.py` -> `PredictionResponse`).
 * Field names are intentionally kept identical to the ML service output so the
 * backend never renames ML fields arbitrarily.
 */

export const PREDICTION_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type PredictionRiskLevel = (typeof PREDICTION_RISK_LEVELS)[number];

/** Result returned by the FastAPI service for a single prediction. */
export interface MLPredictionResult {
  prediction: 0 | 1;
  prediction_label: 'dropout' | 'not_dropout';
  risk_probability: number;
  threshold: number;
  risk_level: PredictionRiskLevel;
  model: string;
}

/** Response of the FastAPI `/health` endpoint (fields discovered from Phase 5). */
export interface MLHealthResult {
  status: string;
  model_loaded: boolean;
  environment: string;
}

/** Runtime type guard exactly matching the FastAPI `PredictionResponse` schema. */
export const isMLPredictionResult = (value: unknown): value is MLPredictionResult => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const riskLevel = v.risk_level;
  return (
    (v.prediction === 0 || v.prediction === 1) &&
    (v.prediction_label === 'dropout' || v.prediction_label === 'not_dropout') &&
    typeof v.risk_probability === 'number' &&
    Number.isFinite(v.risk_probability) &&
    v.risk_probability >= 0 &&
    v.risk_probability <= 1 &&
    typeof v.threshold === 'number' &&
    Number.isFinite(v.threshold) &&
    (riskLevel === 'LOW' || riskLevel === 'MEDIUM' || riskLevel === 'HIGH') &&
    typeof v.model === 'string' &&
    v.model.length > 0
  );
};

/** Runtime type guard for the FastAPI `/health` response. */
export const isMLHealthResult = (value: unknown): value is MLHealthResult => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.status === 'string' &&
    typeof v.model_loaded === 'boolean' &&
    typeof v.environment === 'string'
  );
};