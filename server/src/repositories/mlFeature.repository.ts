import pool from '../config/db.js';

/**
 * An assessment row counts as "attempted" when the student has actually
 * engaged with it (submitted / scored / marked as such). Planned-but-unattempted
 * assessments still count toward `assessments_due`.
 *
 * The status vocabulary is not fixed in the schema, so the guard is deliberately
 * permissive (ILIKE) to catch SUBMITTED / GRADED / COMPLETED / ATTEMPTED variants.
 */
const ATTEMPTED_CONDITION = `
  obtained_marks IS NOT NULL
  OR submitted_at IS NOT NULL
  OR status ILIKE '%SUBMITTED%'
  OR status ILIKE '%GRADED%'
  OR status ILIKE '%COMPLETED%'
  OR status ILIKE '%ATTEMPTED%'
`;

/** Student profile columns needed by ML1 (from the `students` table). */
export interface MLStudentProfile {
  id: number;
  gender: string | null;
  region: string | null;
  highest_education: string | null;
  imd_band: string | null;
  age_band: string | null;
  num_of_prev_attempts: number | null;
  studied_credits: string | null;
  disability: boolean | null;
  registration_date: string | null;
}

/** Aggregates computed in one pass over `assessment_records`. */
export interface AssessmentAggregateRow {
  assessments_due: number;
  assessments_attempted: number;
  avg_score: string | null;
  max_score: string | null;
  min_score: string | null;
  score_std: string | null;
  weighted_score: string | null;
  total_assessment_weight: string | null;
  avg_submission_delay: string | null;
  max_submission_delay: string | null;
  late_submission_count: number;
  on_time_submission_count: number;
  distinct_course_codes: number;
  primary_course_code: string | null;
}

/** Aggregates computed in one pass over `lms_activity_records`. */
export interface LmsAggregateRow {
  total_clicks: number;
  active_days: number;
  unique_sites: number;
  avg_daily_clicks: string | null;
  max_daily_clicks: string | null;
}

class MLFeatureRepository {
  // Student profile (ML columns only). Returns null when the student does not exist.
  async getProfile(studentId: number): Promise<MLStudentProfile | null> {
    const query = {
      text: `
        SELECT id, gender, region, highest_education, imd_band, age_band,
               num_of_prev_attempts, studied_credits, disability, registration_date
        FROM students
        WHERE id = $1;
      `,
      values: [studentId]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as MLStudentProfile) || null;
  }

  // One aggregate query over all assessment records for a student.
  async getAssessmentAggregates(studentId: number): Promise<AssessmentAggregateRow> {
    const query = {
      text: `
        WITH a AS (
          SELECT
            weight,
            course_code,
            (${ATTEMPTED_CONDITION}) AS attempted,
            CASE
              WHEN max_marks IS NOT NULL AND max_marks > 0 THEN obtained_marks / max_marks * 100
            END AS score,
            CASE
              WHEN submitted_at IS NOT NULL AND due_date IS NOT NULL
                THEN EXTRACT(EPOCH FROM (submitted_at - due_date)) / 86400.0
            END AS submission_delay
          FROM assessment_records
          WHERE student_id = $1
        )
        SELECT
          COUNT(*)::int AS assessments_due,
          COUNT(*) FILTER (WHERE a.attempted)::int AS assessments_attempted,
          AVG(a.score) FILTER (WHERE a.attempted AND a.score IS NOT NULL) AS avg_score,
          MAX(a.score) FILTER (WHERE a.attempted AND a.score IS NOT NULL) AS max_score,
          MIN(a.score) FILTER (WHERE a.attempted AND a.score IS NOT NULL) AS min_score,
          STDDEV_SAMP(a.score) FILTER (WHERE a.attempted AND a.score IS NOT NULL) AS score_std,
          SUM(a.score * a.weight / 100.0)
            FILTER (WHERE a.attempted AND a.score IS NOT NULL AND a.weight IS NOT NULL) AS weighted_score,
          SUM(a.weight) FILTER (WHERE a.attempted AND a.weight IS NOT NULL) AS total_assessment_weight,
          AVG(a.submission_delay)
            FILTER (WHERE a.attempted AND a.submission_delay IS NOT NULL) AS avg_submission_delay,
          MAX(a.submission_delay)
            FILTER (WHERE a.attempted AND a.submission_delay IS NOT NULL) AS max_submission_delay,
          COUNT(*) FILTER (
            WHERE a.attempted AND a.submission_delay IS NOT NULL AND a.submission_delay > 0
          )::int AS late_submission_count,
          COUNT(*) FILTER (
            WHERE a.attempted AND a.submission_delay IS NOT NULL AND a.submission_delay <= 0
          )::int AS on_time_submission_count,
          COUNT(DISTINCT a.course_code) FILTER (WHERE a.course_code IS NOT NULL)::int AS distinct_course_codes,
          MIN(a.course_code) FILTER (WHERE a.course_code IS NOT NULL) AS primary_course_code
        FROM a;
      `,
      values: [studentId]
    };
    const { rows } = await pool.query(query);
    return rows[0] as AssessmentAggregateRow;
  }

  // One aggregate query over all LMS activity records for a student.
  async getLmsAggregates(studentId: number): Promise<LmsAggregateRow> {
    const query = {
      text: `
        SELECT
          COALESCE(SUM(click_count), 0)::int AS total_clicks,
          COUNT(DISTINCT activity_date)::int AS active_days,
          COUNT(DISTINCT site_name)::int AS unique_sites,
          AVG(click_count) AS avg_daily_clicks,
          MAX(click_count) AS max_daily_clicks
        FROM lms_activity_records
        WHERE student_id = $1;
      `,
      values: [studentId]
    };
    const { rows } = await pool.query(query);
    return rows[0] as LmsAggregateRow;
  }
}

export default new MLFeatureRepository();