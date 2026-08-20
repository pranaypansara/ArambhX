import fs from "node:fs";
import path from "node:path";
import pool from "../config/db.js";
import { predictStudent } from "../services/prediction.service.js";
import { analyzeStudentRisk } from "../services/riskAnalysis.service.js";
import {
  generateInterventions,
  updateInterventionStatus,
} from "../services/intervention.service.js";
import { UserRole } from "../types/auth.types.js";

const SOURCE_DIR = path.resolve(process.cwd(), "ml/source/data");
const PREFIX = "ARAMBH-ADDED-";
const TARGET_STUDENTS = 40;
const PERIODS = [
  "2025-09-01",
  "2025-10-01",
  "2025-11-01",
  "2025-12-01",
  "2026-01-01",
  "2026-02-01",
];
const LABEL_TARGETS: Array<[string, number]> = [
  ["Withdrawn", 9],
  ["Fail", 9],
  ["Pass", 8],
  ["Distinction", 7],
];
const DEPARTMENTS: Record<string, string> = {
  AAA: "Electrical Engineering",
  BBB: "Mechanical Engineering",
  CCC: "Information Technology",
  DDD: "Computer Science",
  EEE: "Electronics Engineering",
  FFF: "Civil Engineering",
  GGG: "Business Administration",
};
const NAMES = [
  "Aarav Mehta",
  "Diya Sharma",
  "Rohan Gupta",
  "Ananya Iyer",
  "Kabir Malhotra",
  "Meera Nair",
  "Vivaan Kapoor",
  "Zoya Khan",
  "Arjun Patel",
  "Ishita Rao",
  "Aditya Joshi",
  "Sara Thomas",
  "Karan Verma",
  "Nisha Menon",
  "Reyansh Singh",
  "Tara Desai",
  "Yash Kulkarni",
  "Aanya Bose",
  "Neil Choudhary",
  "Mira Shah",
  "Dev Bhat",
  "Kiara Sethi",
  "Manav Reddy",
  "Riya Das",
  "Aman Roy",
  "Sana Ali",
  "Harsh Jain",
  "Veda Pillai",
  "Om Prakash",
  "Navya Shetty",
  "Veer Sinha",
  "Myra Kapoor",
  "Dhruv Rao",
];

interface Row {
  [key: string]: string;
}
interface Profile {
  source: Row;
  label: string;
  index: number;
}

function csvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += char;
  }
  values.push(value);
  return values;
}

function csv(file: string): Row[] {
  const lines = fs
    .readFileSync(path.join(SOURCE_DIR, file), "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = csvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = csvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function number(value: string | undefined): number | null {
  if (!value) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function sourceKey(row: Row): string {
  return `${row.id_student}|${row.code_module}|${row.code_presentation}`;
}

function chooseProfiles(rows: Row[], needed: number): Profile[] {
  const selected: Profile[] = [];
  const seen = new Set<string>();
  for (const [label, target] of LABEL_TARGETS) {
    for (const row of rows) {
      if (row.final_result !== label || seen.has(row.id_student)) continue;
      seen.add(row.id_student);
      selected.push({ source: row, label, index: selected.length });
      if (selected.filter((item) => item.label === label).length >= target)
        break;
    }
  }
  return selected.slice(0, needed);
}

function scoreFor(
  profile: Profile,
  sourceScores: number[],
  period: number,
): number {
  const source = sourceScores.length
    ? sourceScores[period % sourceScores.length]
    : profile.label === "Withdrawn"
      ? 35
      : profile.label === "Fail"
        ? 48
        : profile.label === "Pass"
          ? 72
          : 88;
  const deterioration =
    profile.label === "Withdrawn"
      ? period * 3
      : profile.label === "Fail"
        ? period * 1.5
        : profile.label === "Pass"
          ? -period * 0.5
          : -period * 0.8;
  return Math.max(15, Math.min(98, source - deterioration));
}

async function insertPeriodData(
  studentId: number,
  profile: Profile,
  period: number,
  sourceScores: number[],
): Promise<void> {
  const date = PERIODS[period];
  const score = scoreFor(profile, sourceScores, period);
  const attendanceBase =
    profile.label === "Withdrawn"
      ? 48
      : profile.label === "Fail"
        ? 62
        : profile.label === "Pass"
          ? 80
          : 91;
  const attendance = Math.max(
    25,
    Math.min(
      99,
      attendanceBase -
        period *
          (profile.label === "Withdrawn"
            ? 3
            : profile.label === "Fail"
              ? 1.5
              : -0.4),
    ),
  );
  const completion = Math.max(
    20,
    Math.min(
      100,
      attendance -
        (profile.label === "Withdrawn" ? 12 : profile.label === "Fail" ? 5 : 0),
    ),
  );
  const clicks = Math.max(
    8,
    Math.round(
      (profile.label === "Withdrawn"
        ? 55
        : profile.label === "Fail"
          ? 180
          : profile.label === "Pass"
            ? 620
            : 980) *
        (1 -
          period *
            (profile.label === "Withdrawn"
              ? 0.08
              : profile.label === "Fail"
                ? 0.04
                : -0.015)),
    ),
  );

  await pool.query(
    `INSERT INTO attendance_records (student_id, attendance_percentage, recorded_at) VALUES ($1, $2, $3);`,
    [studentId, attendance, date],
  );
  await pool.query(
    `INSERT INTO academic_records (student_id, average_marks, backlog_count, assignment_completion, lms_activity, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6);`,
    [
      studentId,
      score,
      profile.label === "Withdrawn"
        ? 3
        : profile.label === "Fail"
          ? 2
          : profile.label === "Pass"
            ? 1
            : 0,
      completion,
      Math.min(100, Math.round(clicks / 10)),
      date,
    ],
  );
  await pool.query(
    `INSERT INTO assessment_records (student_id, assessment_name, assessment_type, course_code, semester, max_marks, obtained_marks, weight, due_date, submitted_at, status)
     VALUES ($1, $2, 'TMA', $3, $4, 100, $5, 20, $6, $7, 'SUBMITTED');`,
    [
      studentId,
      `Demo ${date.slice(0, 7)} Assessment`,
      profile.source.code_module,
      String(2025 + period),
      score,
      date,
      date,
    ],
  );
  await pool.query(
    `INSERT INTO lms_activity_records (student_id, activity_date, site_name, activity_type, click_count, duration_minutes)
     VALUES ($1, $2, $3, 'resource', $4, $5);`,
    [
      studentId,
      date,
      `module-${profile.source.code_module.toLowerCase()}`,
      clicks,
      Math.max(10, Math.round(clicks * 1.2)),
    ],
  );
}

async function main(): Promise<void> {
  const before = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM students;",
  );
  const currentTotal = before.rows[0].count;
  const sourceProfiles = chooseProfiles(
    csv("studentInfo.csv"),
    Math.max(0, TARGET_STUDENTS - currentTotal) +
      (
        await pool.query<{ count: number }>(
          "SELECT COUNT(*)::int AS count FROM students WHERE enrollment_number LIKE $1;",
          [`${PREFIX}%`],
        )
      ).rows[0].count,
  );
  const assessments = csv("studentAssessment.csv");
  const staff = await pool.query<{ id: number; role: UserRole }>(
    `SELECT id, role FROM users WHERE role IN ('ADMIN', 'FACULTY', 'COUNSELOR') ORDER BY CASE role WHEN 'ADMIN' THEN 1 WHEN 'FACULTY' THEN 2 ELSE 3 END LIMIT 1;`,
  );
  if (!staff.rows[0])
    throw new Error(
      "No existing staff account is available to own demo audit/notification events.",
    );
  const actorId = staff.rows[0].id;
  const added: Array<{
    studentId: number;
    profile: Profile;
    scores: number[];
  }> = [];

  for (const profile of sourceProfiles) {
    const enrollment = `${PREFIX}${String(profile.index + 1).padStart(2, "0")}`;
    const existing = await pool.query<{ id: number }>(
      "SELECT id FROM students WHERE enrollment_number = $1;",
      [enrollment],
    );
    const studentId =
      existing.rows[0]?.id ??
      (
        await pool.query<{ id: number }>(
          `INSERT INTO students (enrollment_number, name, email, department, semester, gender, region, highest_education, imd_band, age_band, num_of_prev_attempts, studied_credits, disability, registration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id;`,
          [
            enrollment,
            NAMES[profile.index],
            `added${String(profile.index + 1).padStart(2, "0")}@arambh.demo`,
            DEPARTMENTS[profile.source.code_module] ?? "General Studies",
            (profile.index % 8) + 1,
            profile.source.gender || null,
            profile.source.region || null,
            profile.source.highest_education || null,
            profile.source.imd_band || null,
            profile.source.age_band || null,
            number(profile.source.num_of_prev_attempts),
            number(profile.source.studied_credits),
            profile.source.disability === "Y",
            "2025-08-15",
          ],
        )
      ).rows[0].id;
    const scores = assessments
      .filter((row) => sourceKey(row) === sourceKey(profile.source))
      .map((row) => number(row.score))
      .filter((value): value is number => value !== null);
    added.push({ studentId, profile, scores });
  }

  let predictionsAdded = 0;
  let analysesAdded = 0;
  let interventionsAdded = 0;
  const createdInterventionIds: number[] = [];
  for (const item of added) {
    console.log(
      `Processing ${PREFIX}${String(item.profile.index + 1).padStart(2, "0")} (${item.studentId})`,
    );
    for (let period = 0; period < PERIODS.length; period += 1) {
      const periodDate = PERIODS[period];
      const existingPeriod = await pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM academic_records WHERE student_id = $1 AND recorded_at::date = $2::date;",
        [item.studentId, periodDate],
      );
      if (existingPeriod.rows[0].count === 0) {
        await insertPeriodData(
          item.studentId,
          item.profile,
          period,
          item.scores,
        );
      }

      const existingPrediction = await pool.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM predictions WHERE student_id = $1 AND predicted_at::date = $2::date;",
        [item.studentId, periodDate],
      );
      if (existingPrediction.rows[0].count === 0) {
        console.log(`  ML1 ${periodDate}`);
        const prediction = await predictStudent(item.studentId, actorId);
        await pool.query(
          "UPDATE predictions SET predicted_at = $1 WHERE id = $2;",
          [new Date(`${periodDate}T12:00:00.000Z`), prediction.stored.id],
        );
        predictionsAdded += 1;
      }
    }
    console.log("  ML2 analysis");
    const analysis = await analyzeStudentRisk(item.studentId, actorId);
    analysesAdded += 1;
    if (
      analysis.risk_category !== "LOW" ||
      analysis.alert.alert_level !== "NORMAL"
    ) {
      const generated = await generateInterventions(item.studentId, actorId);
      interventionsAdded += generated.created.length;
      createdInterventionIds.push(
        ...generated.created.map((intervention) => intervention.id),
      );
    }
  }

  for (let index = 0; index < createdInterventionIds.length; index += 1) {
    const id = createdInterventionIds[index];
    if (index % 3 === 0) {
      await updateInterventionStatus(id, "ASSIGNED", actorId);
      await updateInterventionStatus(id, "IN_PROGRESS", actorId);
    } else if (index % 3 === 1) {
      await updateInterventionStatus(id, "ASSIGNED", actorId);
      await updateInterventionStatus(id, "IN_PROGRESS", actorId);
      await updateInterventionStatus(id, "COMPLETED", actorId);
      await updateInterventionStatus(id, "EVALUATED", actorId);
    }
  }

  const after = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM students;",
  );
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM predictions) AS predictions,
      (SELECT COUNT(DISTINCT student_id)::int FROM predictions) AS analyzed_students,
      (SELECT COUNT(*)::int FROM alerts) AS alerts,
      (SELECT COUNT(*)::int FROM interventions) AS interventions,
      (SELECT COUNT(*)::int FROM notifications) AS notifications,
      (SELECT json_object_agg(risk_level, total) FROM (SELECT risk_level, COUNT(*)::int AS total FROM predictions GROUP BY risk_level) risks) AS risk_distribution,
      (SELECT json_object_agg(status, total) FROM (SELECT status, COUNT(*)::int AS total FROM interventions GROUP BY status) statuses) AS intervention_status_distribution;`);
  console.log(
    JSON.stringify(
      {
        beforeStudents: currentTotal,
        addedStudents: added.length,
        afterStudents: after.rows[0].count,
        historicalDateRange: {
          start: PERIODS[0],
          end: PERIODS[PERIODS.length - 1],
        },
        predictionsAdded,
        analysesAdded,
        interventionsAdded,
        ...counts.rows[0],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Additional demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
