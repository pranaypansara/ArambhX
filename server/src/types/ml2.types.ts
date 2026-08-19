/**
 * ML2 risk-intelligence types.
 *
 * These mirror the exact response/request schema of the Phase 8 FastAPI ML2
 * endpoint (`server/ml/service/app/schemas/ml2.py`). Field names are kept
 * identical to the ML service output so the backend never renames ML2 fields.
 */

import { ML1Features } from './mlFeatures.types.js';

export const ML2_RISK_CATEGORIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type ML2RiskCategory = (typeof ML2_RISK_CATEGORIES)[number];

export const ML2_TREND_VALUES = ['INCREASING', 'DECREASING', 'STABLE'] as const;
export type ML2TrendValue = (typeof ML2_TREND_VALUES)[number];

export const ML2_TRAJECTORY_VALUES = ['ESCALATING', 'IMPROVING', 'VOLATILE', 'STABLE'] as const;
export type ML2TrajectoryValue = (typeof ML2_TRAJECTORY_VALUES)[number];

/** One stored ML1 prediction used as a risk snapshot for ML2 trend analysis. */
export interface ML2RiskHistoryPoint {
  risk_probability: number;
  predicted_at: string | null;
}

/** Trend metrics computed over the risk snapshot sequence. */
export interface ML2RiskTrend {
  num_snapshots: number;
  first_risk: number;
  latest_risk: number;
  risk_velocity: number;
  risk_acceleration: number;
  risk_max_velocity: number;
  risk_volatility: number;
  risk_trend: ML2TrendValue;
  trajectory_pattern: ML2TrajectoryValue;
}

/** Smart-alert engine output. */
export interface ML2Alert {
  alert_score: number;
  alert_level: 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alert_types: string[];
}

/** Intervention catalog match. */
export interface ML2Recommendation {
  intervention_code: string;
  intervention_name: string;
  suitability_score: number;
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';
  matched_triggers: string[];
}

/** Request body sent to the FastAPI `/ml2/analyze` endpoint. */
export interface ML2AnalysisRequest {
  student_id: number;
  features: ML1Features;
  risk_history: ML2RiskHistoryPoint[];
}

/** Structured ML2 risk intelligence returned for one student. */
export interface ML2AnalysisResponse {
  student_id: number;
  risk_probability: number;
  risk_category: ML2RiskCategory;
  risk_trend: ML2RiskTrend;
  alert: ML2Alert;
  recommendations: ML2Recommendation[];
  risk_history: ML2RiskHistoryPoint[];
}

const isNonNegativeFiniteNumber = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isSupportedTrend = (value: unknown): value is ML2TrendValue =>
  value === 'INCREASING' || value === 'DECREASING' || value === 'STABLE';

const isSupportedTrajectory = (value: unknown): value is ML2TrajectoryValue =>
  value === 'ESCALATING' ||
  value === 'IMPROVING' ||
  value === 'VOLATILE' ||
  value === 'STABLE';

const isRiskHistoryPoint = (value: unknown): value is ML2RiskHistoryPoint => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.risk_probability === 'number' &&
    Number.isFinite(v.risk_probability) &&
    v.risk_probability >= 0 &&
    v.risk_probability <= 1 &&
    (v.predicted_at === null || typeof v.predicted_at === 'string')
  );
};

const isRecommendation = (value: unknown): value is ML2Recommendation => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.intervention_code === 'string' &&
    v.intervention_code.length > 0 &&
    typeof v.intervention_name === 'string' &&
    v.intervention_name.length > 0 &&
    typeof v.suitability_score === 'number' &&
    Number.isFinite(v.suitability_score) &&
    (v.intensity === 'LOW' || v.intensity === 'MEDIUM' || v.intensity === 'HIGH') &&
    Array.isArray(v.matched_triggers) &&
    v.matched_triggers.every((t) => typeof t === 'string')
  );
};

/** Runtime type guard exactly matching the FastAPI `ML2AnalysisResponse`. */
export const isML2AnalysisResponse = (value: unknown): value is ML2AnalysisResponse => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const trend = v.risk_trend as Record<string, unknown> | undefined;
  const alert = v.alert as Record<string, unknown> | undefined;
  return (
    typeof v.student_id === 'number' &&
    Number.isInteger(v.student_id) &&
    v.student_id > 0 &&
    isNonNegativeFiniteNumber(v.risk_probability) &&
    (v.risk_category === 'LOW' || v.risk_category === 'MEDIUM' || v.risk_category === 'HIGH') &&
    typeof trend === 'object' &&
    trend !== null &&
    typeof trend.num_snapshots === 'number' &&
    isNonNegativeFiniteNumber(trend.first_risk) &&
    isNonNegativeFiniteNumber(trend.latest_risk) &&
    typeof trend.risk_velocity === 'number' &&
    Number.isFinite(trend.risk_velocity) &&
    typeof trend.risk_acceleration === 'number' &&
    Number.isFinite(trend.risk_acceleration) &&
    typeof trend.risk_max_velocity === 'number' &&
    Number.isFinite(trend.risk_max_velocity) &&
    typeof trend.risk_volatility === 'number' &&
    Number.isFinite(trend.risk_volatility) &&
    isSupportedTrend(trend.risk_trend) &&
    isSupportedTrajectory(trend.trajectory_pattern) &&
    typeof alert === 'object' &&
    alert !== null &&
    typeof alert.alert_score === 'number' &&
    Number.isFinite(alert.alert_score) &&
    typeof alert.alert_level === 'string' &&
    alert.alert_level.length > 0 &&
    Array.isArray(alert.alert_types) &&
    alert.alert_types.every((t) => typeof t === 'string') &&
    Array.isArray(v.recommendations) &&
    v.recommendations.every(isRecommendation) &&
    Array.isArray(v.risk_history) &&
    v.risk_history.every(isRiskHistoryPoint)
  );
};