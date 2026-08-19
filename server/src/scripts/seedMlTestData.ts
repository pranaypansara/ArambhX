import pool from '../config/db.js';

/**
 * Phase 4: ML Feature Builder test data.
 *
 * Creates four demo students with distinct behavioural profiles so the Phase 3
 * ML Feature Builder (`GET /api/students/:id/ml-features` / `buildMLFeatures`)
 * produces meaningfully different feature payloads.
 *
 * ONLY the tables read by the ML1 feature builder are seeded:
 *   - students
 *   - assessment_records
 *   - lms_activity_records
 *
 * Idempotency: demo students are identified by a reserved enrollment-number
 * prefix (`SIH-ML-DEMO-*`). On every run the script finds each demo student,
 * deletes ONLY that student's seeded child rows, and recreates them, so it is
 * safe to run repeatedly in the development/demo database.
 *
 * No schema changes. Run with: npm run seed:ml
 */

// Deterministic PRNG so repeated runs produce identical demo data.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoAssessment {
  name: string;
  type: string;
  maxMarks: number;
  obtainedMarks: number | null;
  weight: number;
  dueDate: string;
  submittedAt: string | null;
  status: string;
}

interface DemoLms {
  days: number;
  totalClicks: number;
  sites: string[];
  seed: number;
}

interface DemoProfile {
  enrollmentNumber: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  profile: {
    gender: string | null;
    region: string | null;
    highestEducation: string | null;
    imdBand: string | null;
    ageBand: string | null;
    numOfPrevAttempts: number;
    studiedCredits: number | null;
    disability: boolean;
    registrationDate: string | null;
  };
  courseCode: string;
  assessments: DemoAssessment[];
  lms: DemoLms;
}

const DEMO_SCHEMA = {
  LOW: {
    enrollmentNumber: 'SIH-ML-DEMO-LOW',
    name: 'Aarav Mehta',
    email: 'aarav.mehta.demo@example.com',
    department: 'Information Technology',
    semester: 4,
    profile: {
      gender: 'M',
      region: 'South East Region',
      highestEducation: 'A Level or Equivalent',
      imdBand: '40-50%',
      ageBand: '0-35',
      numOfPrevAttempts: 0,
      studiedCredits: 60,
      disability: false,
      registrationDate: '2026-01-05'
    },
    courseCode: 'CCC',
    assessments: [
      { name: 'TMA01', type: 'TMA', maxMarks: 100, obtainedMarks: 92, weight: 10, dueDate: '2026-01-20T09:00:00.000Z', submittedAt: '2026-01-18T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA02', type: 'TMA', maxMarks: 100, obtainedMarks: 88, weight: 10, dueDate: '2026-02-10T09:00:00.000Z', submittedAt: '2026-02-07T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA03', type: 'TMA', maxMarks: 100, obtainedMarks: 90, weight: 10, dueDate: '2026-02-25T09:00:00.000Z', submittedAt: '2026-02-24T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA04', type: 'TMA', maxMarks: 100, obtainedMarks: 85, weight: 20, dueDate: '2026-03-15T09:00:00.000Z', submittedAt: '2026-03-12T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'EXAM', type: 'Exam', maxMarks: 100, obtainedMarks: 80, weight: 50, dueDate: '2026-04-10T09:00:00.000Z', submittedAt: '2026-04-08T09:00:00.000Z', status: 'SUBMITTED' }
    ],
    lms: { days: 30, totalClicks: 1840, sites: ['homepage', 'resource', 'cricket', 'news_forum'], seed: 11 }
  },
  MODERATE: {
    enrollmentNumber: 'SIH-ML-DEMO-MODERATE',
    name: 'Priya Nair',
    email: 'priya.nair.demo@example.com',
    department: 'Computer Science',
    semester: 3,
    profile: {
      gender: 'F',
      region: 'London Region',
      highestEducation: 'HE Qualification',
      imdBand: '50-60%',
      ageBand: '35-55',
      numOfPrevAttempts: 1,
      studiedCredits: 120,
      disability: false,
      registrationDate: '2026-01-15'
    },
    courseCode: 'EEE',
    assessments: [
      { name: 'TMA01', type: 'TMA', maxMarks: 100, obtainedMarks: 72, weight: 10, dueDate: '2026-01-20T09:00:00.000Z', submittedAt: '2026-01-19T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA02', type: 'TMA', maxMarks: 100, obtainedMarks: 65, weight: 10, dueDate: '2026-02-10T09:00:00.000Z', submittedAt: '2026-02-12T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA03', type: 'TMA', maxMarks: 100, obtainedMarks: 58, weight: 10, dueDate: '2026-02-25T09:00:00.000Z', submittedAt: '2026-02-28T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA04', type: 'TMA', maxMarks: 100, obtainedMarks: 60, weight: 10, dueDate: '2026-03-14T09:00:00.000Z', submittedAt: '2026-03-15T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA05', type: 'TMA', maxMarks: 100, obtainedMarks: 70, weight: 10, dueDate: '2026-04-10T09:00:00.000Z', submittedAt: '2026-04-11T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'EXAM', type: 'Exam', maxMarks: 100, obtainedMarks: null, weight: 50, dueDate: '2026-05-01T09:00:00.000Z', submittedAt: null, status: 'PENDING' }
    ],
    lms: { days: 12, totalClicks: 480, sites: ['homepage', 'resource', 'cricket'], seed: 22 }
  },
  HIGH: {
    enrollmentNumber: 'SIH-ML-DEMO-HIGH',
    name: 'Rohan Gupta',
    email: 'rohan.gupta.demo@example.com',
    department: 'Electrical Engineering',
    semester: 5,
    profile: {
      gender: 'M',
      region: 'North Region',
      highestEducation: 'Lower Than A Level',
      imdBand: '20-30%',
      ageBand: '35-55',
      numOfPrevAttempts: 2,
      studiedCredits: 60,
      disability: true,
      registrationDate: '2026-01-25'
    },
    courseCode: 'AAA',
    assessments: [
      { name: 'TMA01', type: 'TMA', maxMarks: 100, obtainedMarks: 42, weight: 10, dueDate: '2026-01-20T09:00:00.000Z', submittedAt: '2026-01-21T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA02', type: 'TMA', maxMarks: 100, obtainedMarks: 31, weight: 10, dueDate: '2026-02-10T09:00:00.000Z', submittedAt: '2026-02-18T09:00:00.000Z', status: 'SUBMITTED' },
      { name: 'TMA03', type: 'TMA', maxMarks: 100, obtainedMarks: null, weight: 10, dueDate: '2026-02-25T09:00:00.000Z', submittedAt: null, status: 'PENDING' },
      { name: 'TMA04', type: 'TMA', maxMarks: 100, obtainedMarks: null, weight: 20, dueDate: '2026-03-14T09:00:00.000Z', submittedAt: null, status: 'PENDING' },
      { name: 'TMA05', type: 'TMA', maxMarks: 100, obtainedMarks: null, weight: 10, dueDate: '2026-04-10T09:00:00.000Z', submittedAt: null, status: 'PENDING' },
      { name: 'EXAM', type: 'Exam', maxMarks: 100, obtainedMarks: null, weight: 50, dueDate: '2026-05-01T09:00:00.000Z', submittedAt: null, status: 'PENDING' }
    ],
    lms: { days: 3, totalClicks: 45, sites: ['homepage', 'resource'], seed: 33 }
  },
  EDGE: {
    enrollmentNumber: 'SIH-ML-DEMO-EDGE',
    name: 'Zara Khan',
    email: 'zara.khan.demo@example.com',
    department: 'Mechanical Engineering',
    semester: 1,
    profile: {
      gender: 'F',
      region: 'West Midlands Region',
      highestEducation: 'No Formal quals',
      imdBand: '90-100%',
      ageBand: '55<=',
      numOfPrevAttempts: 0,
      studiedCredits: 30,
      disability: false,
      registrationDate: '2026-02-01'
    },
    courseCode: 'BBB',
    assessments: [],
    lms: { days: 0, totalClicks: 0, sites: [], seed: 44 }
  }
} satisfies Record<string, DemoProfile>;

const DEMO_PROFILES = Object.values(DEMO_SCHEMA);
const DEMO_LABELS = Object.keys(DEMO_SCHEMA) as Array<keyof typeof DEMO_SCHEMA>;

/** Deterministic per-day click distribution summing exactly to `totalClicks`. */
function generatePerDayClicks(days: number, totalClicks: number, seed: number): number[] {
  if (days <= 0 || totalClicks <= 0) return [];
  const rng = mulberry32(seed);
  const base = Math.max(1, Math.floor(totalClicks / days));
  const perDay: number[] = [];
  for (let i = 0; i < days; i++) {
    let value = base;
    if (base > 1) {
      value = Math.max(1, base + Math.floor((rng() - 0.5) * base));
    }
    perDay.push(value);
  }
  const diff = totalClicks - perDay.reduce((sum, n) => sum + n, 0);
  perDay[days - 1] += diff;
  if (perDay[days - 1] < 1) {
    const shortfall = 1 - perDay[days - 1];
    perDay[days - 1] = 1;
    perDay[0] -= shortfall;
  }
  return perDay;
}

/** Spread activity over `days` calendar dates starting at `startIso`. */
function generateLmsDates(days: number, startIso: string, stepDays: number): string[] {
  const start = new Date(startIso);
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i * stepDays);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

interface SeedSummary {
  label: string;
  studentId: number | null;
  created: boolean;
  assessmentsInserted: number;
  lmsRowsInserted: number;
}

async function main(): Promise<void> {
  console.log('🌱 Seeding ML feature-builder demo data...\n');

  const client = await pool.connect();
  const summaries: SeedSummary[] = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < DEMO_PROFILES.length; i++) {
      const profile = DEMO_PROFILES[i];
      const label = DEMO_LABELS[i];

      const existing = await client.query(
        'SELECT id FROM students WHERE enrollment_number = $1;',
        [profile.enrollmentNumber]
      );

      let studentId: number;
      let created = false;
      if (existing.rows.length > 0) {
        // Idempotency: reuse the demo student, clear ONLY its seeded child rows.
        studentId = existing.rows[0].id as number;
        await client.query('DELETE FROM assessment_records WHERE student_id = $1;', [studentId]);
        await client.query('DELETE FROM lms_activity_records WHERE student_id = $1;', [studentId]);
      } else {
        created = true;
        const inserted = await client.query(
          `INSERT INTO students (
             enrollment_number, name, email, department, semester,
             gender, region, highest_education, imd_band, age_band,
             num_of_prev_attempts, studied_credits, disability, registration_date
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id;`,
          [
            profile.enrollmentNumber,
            profile.name,
            profile.email,
            profile.department,
            profile.semester,
            profile.profile.gender,
            profile.profile.region,
            profile.profile.highestEducation,
            profile.profile.imdBand,
            profile.profile.ageBand,
            profile.profile.numOfPrevAttempts,
            profile.profile.studiedCredits,
            profile.profile.disability,
            profile.profile.registrationDate
          ]
        );
        studentId = inserted.rows[0].id as number;
      }

      // Assessments: every record shares the single course code so the feature
      // builder derives a stable `code_module`.
      for (const a of profile.assessments) {
        await client.query(
          `INSERT INTO assessment_records (
             student_id, assessment_name, assessment_type, course_code, semester,
             max_marks, obtained_marks, weight, due_date, submitted_at, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
          [
            studentId,
            a.name,
            a.type,
            profile.courseCode,
            '2026',
            a.maxMarks,
            a.obtainedMarks,
            a.weight,
            a.dueDate,
            a.submittedAt,
            a.status
          ]
        );
      }

      // LMS activity: one row per active day within the semester window.
      const clicks = generatePerDayClicks(profile.lms.days, profile.lms.totalClicks, profile.lms.seed);
      const dates = generateLmsDates(profile.lms.days, '2026-02-02', 7);
      for (let d = 0; d < clicks.length; d++) {
        const site = profile.lms.sites[d % profile.lms.sites.length];
        await client.query(
          `INSERT INTO lms_activity_records (student_id, activity_date, site_name, activity_type, click_count, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [studentId, dates[d], site, 'CLICK', clicks[d], Math.round(clicks[d] * 1.5)]
        );
      }

      summaries.push({
        label,
        studentId,
        created,
        assessmentsInserted: profile.assessments.length,
        lmsRowsInserted: clicks.length
      });
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log('✅ Seeding complete. Summary:');
  for (const s of summaries) {
    console.log(
      `  ${s.label.padEnd(10)} student id=${s.studentId} (${s.created ? 'created' : 're-seeded'}) ` +
      `assessments=${s.assessmentsInserted} lms_rows=${s.lmsRowsInserted}`
    );
  }
  await pool.end();
}

main().catch((err: unknown) => {
  console.error('❌ Seed failed:', err);
  process.exitCode = 1;
});