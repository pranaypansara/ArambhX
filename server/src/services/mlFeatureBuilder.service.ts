import MLFeatureRepository, {
  MLStudentProfile,
  AssessmentAggregateRow,
  LmsAggregateRow
} from '../repositories/mlFeature.repository.js';
import { ML1Features } from '../types/mlFeatures.types.js';

/**
 * Converts a DB scalar (pg may surface numerics as strings) to number.
 * Returns null for genuinely absent values so callers can apply the
 * intended missing-value policy explicitly.
 */
export const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Notebook convention: `x / y` where a zero denominator means "no activity" -> 0. */
export const safeDivide = (numerator: number, denominator: number): number =>
  denominator > 0 ? numerator / denominator : 0;

/** Boolean `disability` is stored as boolean in the DB but trained as 'Y'/'N'. */
export const disabilityToString = (disability: boolean | null): string | null => {
  if (disability === null || disability === undefined) return null;
  return disability ? 'Y' : 'N';
};

/** Map a DB numeric aggregate row into the pipeline's numeric feature values. */
export const buildAssessmentNumericFeatures = (
  row: AssessmentAggregateRow
): {
  assessments_attempted: number;
  avg_assessment_score: number;
  max_assessment_score: number;
  min_assessment_score: number;
  assessment_score_std: number;
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
} => {
  const attempted = row.assessments_attempted;
  const due = row.assessments_due;

  const avgScore = toNumber(row.avg_score) ?? 0;
  const std = toNumber(row.score_std) ?? 0;
  const weightedScore = toNumber(row.weighted_score) ?? 0;
  const totalWeight = toNumber(row.total_assessment_weight) ?? 0;

  return {
    assessments_attempted: attempted,
    avg_assessment_score: avgScore,
    max_assessment_score: toNumber(row.max_score) ?? 0,
    min_assessment_score: toNumber(row.min_score) ?? 0,
    assessment_score_std: std,
    assessments_due: due,
    assessment_completion_rate: safeDivide(attempted, due),
    assessments_missed: Math.max(due - attempted, 0),
    weighted_score: weightedScore,
    total_assessment_weight: totalWeight,
    weighted_performance: safeDivide(weightedScore, totalWeight),
    avg_submission_delay: toNumber(row.avg_submission_delay) ?? 0,
    max_submission_delay: toNumber(row.max_submission_delay) ?? 0,
    late_submission_count: row.late_submission_count,
    on_time_submission_count: row.on_time_submission_count
  };
};

/** Map a DB LMS aggregate row into the pipeline's engagement feature values. */
export const buildLmsNumericFeatures = (
  row: LmsAggregateRow
): {
  total_clicks: number;
  active_days: number;
  unique_sites: number;
  avg_daily_clicks: number;
  max_daily_clicks: number;
  clicks_per_active_day: number;
  sites_per_active_day: number;
} => {
  const totalClicks = toNumber(row.total_clicks) ?? 0;
  const activeDays = row.active_days;
  const uniqueSites = row.unique_sites;

  return {
    total_clicks: totalClicks,
    active_days: activeDays,
    unique_sites: uniqueSites,
    avg_daily_clicks: toNumber(row.avg_daily_clicks) ?? 0,
    max_daily_clicks: toNumber(row.max_daily_clicks) ?? 0,
    clicks_per_active_day: safeDivide(totalClicks, activeDays),
    sites_per_active_day: safeDivide(uniqueSites, activeDays)
  };
};

/** Derive a best-effort module code from the student's assessed courses. */
export const deriveCodeModule = (row: AssessmentAggregateRow): string | null => {
  if (row.distinct_course_codes === 1 && row.primary_course_code) {
    return row.primary_course_code;
  }
  return null;
};

/**
 * Builds the complete ML1-compatible feature object for one student.
 *
 * Returns null when the student does not exist, an object otherwise.
 * This function NEVER runs the ML1 pipeline — it only prepares its input.
 */
export const buildMLFeatures = async (studentId: number): Promise<ML1Features | null> => {
  const profile = await MLFeatureRepository.getProfile(studentId);
  if (!profile) return null;

  const [assessmentRow, lmsRow] = await Promise.all([
    MLFeatureRepository.getAssessmentAggregates(studentId),
    MLFeatureRepository.getLmsAggregates(studentId)
  ]);

  const assessments = buildAssessmentNumericFeatures(assessmentRow);
  const lms = buildLmsNumericFeatures(lmsRow);

  // Keys are emitted in the exact `feature_names_in_` order of the trained ML1 pipeline.
  return {
    // Categoricals (undefined / missing -> "Unknown", the pipeline's own convention)
    code_module: deriveCodeModule(assessmentRow) ?? 'Unknown',
    gender: profile.gender || 'Unknown',
    region: profile.region || 'Unknown',
    highest_education: profile.highest_education || 'Unknown',
    imd_band: profile.imd_band || 'Unknown',
    age_band: profile.age_band || 'Unknown',

    num_of_prev_attempts: toNumber(profile.num_of_prev_attempts),
    studied_credits: toNumber(profile.studied_credits),
    disability: disabilityToString(profile.disability) || 'Unknown',

    assessments_attempted: assessments.assessments_attempted,
    avg_assessment_score: assessments.avg_assessment_score,
    max_assessment_score: assessments.max_assessment_score,
    min_assessment_score: assessments.min_assessment_score,
    assessment_score_std: assessments.assessment_score_std,

    // Requires a module-start day offset not stored in the database -> left null
    // so the trained pipeline's own median imputer can fill it in Phase 4.
    avg_submission_date: null,

    assessments_due: assessments.assessments_due,
    assessment_completion_rate: assessments.assessment_completion_rate,
    assessments_missed: assessments.assessments_missed,
    weighted_score: assessments.weighted_score,
    total_assessment_weight: assessments.total_assessment_weight,
    weighted_performance: assessments.weighted_performance,
    avg_submission_delay: assessments.avg_submission_delay,
    max_submission_delay: assessments.max_submission_delay,
    late_submission_count: assessments.late_submission_count,
    on_time_submission_count: assessments.on_time_submission_count,

    total_clicks: lms.total_clicks,
    active_days: lms.active_days,
    unique_sites: lms.unique_sites,
    avg_daily_clicks: lms.avg_daily_clicks,
    max_daily_clicks: lms.max_daily_clicks,
    clicks_per_active_day: lms.clicks_per_active_day,
    sites_per_active_day: lms.sites_per_active_day,

    // Same limitation: registration day-offset relative to module start is not
    // representable from an absolute `registration_date` alone.
    date_registration: null,
    registration_early: null,
    registration_late: null
  };
};