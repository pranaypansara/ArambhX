/**
 * ML1 feature-schema types.
 *
 * The exact input contract for the trained ML1 pipeline
 * (`server/ml/source/ml1_prediction_pipeline.pkl`) was inspected from the
 * serialized pipeline itself. The pipeline expects a single-row DataFrame with
 * exactly the 35 columns declared in `feature_names_in_` (see `ML1_FEATURE_ORDER`).
 *
 * Pipeline preprocessing (baked into the pickle):
 *   - numeric  -> SimpleImputer(strategy="median")
 *   - category -> SimpleImputer(strategy="most_frequent") + OneHotEncoder(handle_unknown="ignore")
 */

/** Exact column order captured on the trained pipeline via `feature_names_in_`. */
export const ML1_FEATURE_ORDER = [
  // categorical (7)
  'code_module',
  'gender',
  'region',
  'highest_education',
  'imd_band',
  'age_band',
  // numeric (2) + categorical (1)
  'num_of_prev_attempts',
  'studied_credits',
  'disability',
  // assessment derived (numeric)
  'assessments_attempted',
  'avg_assessment_score',
  'max_assessment_score',
  'min_assessment_score',
  'assessment_score_std',
  'avg_submission_date',
  'assessments_due',
  'assessment_completion_rate',
  'assessments_missed',
  'weighted_score',
  'total_assessment_weight',
  'weighted_performance',
  'avg_submission_delay',
  'max_submission_delay',
  'late_submission_count',
  'on_time_submission_count',
  // LMS engagement (numeric)
  'total_clicks',
  'active_days',
  'unique_sites',
  'avg_daily_clicks',
  'max_daily_clicks',
  'clicks_per_active_day',
  'sites_per_active_day',
  // registration (numeric)
  'date_registration',
  'registration_early',
  'registration_late'
] as const;

export type ML1FeatureKey = (typeof ML1_FEATURE_ORDER)[number];

/**
 * The exact payload ML1 expects. Key set IS the pipeline input schema.
 * `null` means "not derivable from the current database" and is left for the
 * pipeline's own imputation in a later phase (this phase never runs ML1).
 */
export interface ML1Features {
  // categorical
  code_module: string | null;
  gender: string | null;
  region: string | null;
  highest_education: string | null;
  imd_band: string | null;
  age_band: string | null;
  // numeric (direct from students / derived)
  num_of_prev_attempts: number | null;
  studied_credits: number | null;
  disability: string | null;
  // assessment derived
  assessments_attempted: number;
  avg_assessment_score: number;
  max_assessment_score: number;
  min_assessment_score: number;
  assessment_score_std: number;
  avg_submission_date: number | null;
  assessments_due: number;
  assessment_completion_rate: number;
  assessments_missed: number;
  weighted_score: number;
  total_assessment_weight: number;
  weighted_performance: number;
  avg_submission_delay: number;
  max_submission_delay: number;
  late_submission_count: number;
  on_time_submission_count: number;
  // LMS engagement
  total_clicks: number;
  active_days: number;
  unique_sites: number;
  avg_daily_clicks: number;
  max_daily_clicks: number;
  clicks_per_active_day: number;
  sites_per_active_day: number;
  // registration (requires a module-start day offset that the DB does not store)
  date_registration: number | null;
  registration_early: number | null;
  registration_late: number | null;
}