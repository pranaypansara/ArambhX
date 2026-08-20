import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import pool from "../config/db.js";
import { hashPassword } from "../services/auth.service.js";
import { predictStudent } from "../services/prediction.service.js";
import { analyzeStudentRisk } from "../services/riskAnalysis.service.js";
import {
  generateInterventions,
  updateInterventionStatus,
} from "../services/intervention.service.js";
import { createNotification } from "../services/notification.service.js";
import { UserRole } from "../types/auth.types.js";
import { InterventionStatus } from "../types/intervention.types.js";

const SOURCE_DIR = path.resolve(process.cwd(), "ml/source/data");
const DEMO_PREFIX = "ARAMBH-DEMO-";
const DEMO_PASSWORD = "ArambhDemo!2026";
const BASE_DATE = new Date("2026-01-05T00:00:00.000Z");

interface CsvRow {
  [key: string]: string;
}

interface SourceProfile extends CsvRow {
  id_student: string;
  code_module: string;
  code_presentation: string;
  final_result: string;
}

interface DemoProfile {
  source: SourceProfile;
  label: string;
  enrollmentNumber: string;
  name: string;
  email: string;
  department: string;
  semester: number;
}

interface AssessmentDefinition extends CsvRow {
  id_assessment: string;
  code_module: string;
  code_presentation: string;
  assessment_type: string;
  date: string;
  weight: string;
}

interface ActivityAggregate {
  studentId: number;
  activityDate: string;
  siteName: string;
  activityType: string;
  clickCount: number;
}

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
];

const DEMO_USERS: Array<{ name: string; email: string; role: UserRole }> = [
  { name: "Arambh Demo Admin", email: "admin@arambh.demo", role: "ADMIN" },
  {
    name: "Arambh Demo Faculty",
    email: "faculty@arambh.demo",
    role: "FACULTY",
  },
  {
    name: "Arambh Demo Counselor",
    email: "counselor@arambh.demo",
    role: "COUNSELOR",
  },
];

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function readSmallCsv(fileName: string): CsvRow[] {
  return parseCsv(fs.readFileSync(path.join(SOURCE_DIR, fileName), "utf8"));
}

async function* readCsv(fileName: string): AsyncGenerator<CsvRow> {
  const input = readline.createInterface({
    input: createReadStream(path.join(SOURCE_DIR, fileName), {
      encoding: "utf8",
    }),
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;
  try {
    for await (const line of input) {
      if (!headers) {
        headers = parseCsvLine(line);
        continue;
      }
      if (line.trim()) {
        const values = parseCsvLine(line);
        yield Object.fromEntries(
          headers.map((header, index) => [header, values[index] ?? ""]),
        );
      }
    }
  } finally {
    input.close();
  }
}

function sourceKey(row: CsvRow): string {
  return `${row.id_student}|${row.code_module}|${row.code_presentation}`;
}

function numberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateFromOffset(
  offset: string | undefined,
  fallbackDays: number,
): Date {
  const days = numberOrNull(offset) ?? fallbackDays;
  return new Date(BASE_DATE.getTime() + days * 24 * 60 * 60 * 1000);
}

function dateOnlyFromOffset(
  offset: string | undefined,
  fallbackDays: number,
): string {
  return dateFromOffset(offset, fallbackDays).toISOString().slice(0, 10);
}

function selectProfiles(rows: SourceProfile[]): DemoProfile[] {
  const targets: Array<[string, number]> = [
    ["Withdrawn", 8],
    ["Fail", 8],
    ["Pass", 7],
    ["Distinction", 7],
  ];
  const seenStudents = new Set<string>();
  const selected: DemoProfile[] = [];

  for (const [label, target] of targets) {
    for (const row of rows) {
      if (row.final_result !== label || seenStudents.has(row.id_student))
        continue;
      seenStudents.add(row.id_student);
      const index = selected.length;
      selected.push({
        source: row,
        label,
        enrollmentNumber: `${DEMO_PREFIX}${String(index + 1).padStart(2, "0")}`,
        name: NAMES[index],
        email: `student${String(index + 1).padStart(2, "0")}@arambh.demo`,
        department: DEPARTMENTS[row.code_module] ?? "General Studies",
        semester: (index % 8) + 1,
      });
      if (
        selected.filter((profile) => profile.label === label).length === target
      )
        break;
    }
  }

  if (selected.length !== 30) {
    throw new Error(`Expected 30 source profiles, selected ${selected.length}`);
  }
  return selected;
}

async function upsertUser(
  name: string,
  email: string,
  role: UserRole,
  studentId: number | null = null,
): Promise<{
  id: number;
  email: string;
  role: UserRole;
  studentId: number | null;
}> {
  const password = await hashPassword(DEMO_PASSWORD);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, student_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password = EXCLUDED.password,
       role = EXCLUDED.role,
       student_id = EXCLUDED.student_id,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, email, role, student_id AS "studentId";`,
    [name, email, password, role, studentId],
  );
  return result.rows[0] as {
    id: number;
    email: string;
    role: UserRole;
    studentId: number | null;
  };
}

async function clearDemoChildren(client: {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
}): Promise<void> {
  await client.query(
    `DELETE FROM notifications
     WHERE related_entity_type = 'ALERT'
       AND related_entity_id IN (SELECT id FROM alerts WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1))`,
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    `DELETE FROM notifications
     WHERE related_entity_type = 'INTERVENTION'
       AND related_entity_id IN (SELECT id FROM interventions WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1))`,
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    "DELETE FROM alerts WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1);",
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    "DELETE FROM interventions WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1);",
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    "DELETE FROM predictions WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1);",
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    "DELETE FROM attendance_records WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1);",
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    "DELETE FROM academic_records WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1);",
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    "DELETE FROM assessment_records WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1);",
    [`${DEMO_PREFIX}%`],
  );
  await client.query(
    "DELETE FROM lms_activity_records WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1);",
    [`${DEMO_PREFIX}%`],
  );
}

async function seedBaseData(
  profiles: DemoProfile[],
): Promise<Map<string, number>> {
  const assessments = readSmallCsv("assessments.csv") as AssessmentDefinition[];
  const courses = new Map(
    readSmallCsv("courses.csv").map((row) => [sourceKey(row), row]),
  );
  const registrations = new Map(
    readSmallCsv("studentRegistration.csv").map((row) => [sourceKey(row), row]),
  );
  const selectedByStudent = new Map(
    profiles.map((profile) => [profile.source.id_student, profile]),
  );
  const assessmentById = new Map(
    assessments.map((row) => [row.id_assessment, row]),
  );
  const assessmentRows = new Map<
    string,
    Array<{ definition: AssessmentDefinition; result: CsvRow }>
  >();
  const activityByStudent = new Map<string, Map<string, ActivityAggregate>>();
  const siteTypes = new Map(
    readSmallCsv("vle.csv").map((row) => [
      `${row.id_site}|${row.code_module}|${row.code_presentation}`,
      row.activity_type || "activity",
    ]),
  );

  for await (const row of readCsv("studentAssessment.csv")) {
    const definition = assessmentById.get(row.id_assessment);
    const profile = definition
      ? selectedByStudent.get(row.id_student)
      : undefined;
    if (
      !definition ||
      !profile ||
      sourceKey(definition) !== sourceKey(profile.source)
    )
      continue;
    const key = profile.source.id_student;
    const list = assessmentRows.get(key) ?? [];
    list.push({ definition, result: row });
    assessmentRows.set(key, list);
  }

  for await (const row of readCsv("studentVle.csv")) {
    const profile = selectedByStudent.get(row.id_student);
    if (
      !profile ||
      row.code_module !== profile.source.code_module ||
      row.code_presentation !== profile.source.code_presentation
    )
      continue;
    const key = `${profile.source.id_student}|${dateOnlyFromOffset(row.date, 0)}|${row.id_site}`;
    const studentActivities =
      activityByStudent.get(profile.source.id_student) ??
      new Map<string, ActivityAggregate>();
    const existing = studentActivities.get(key);
    const activityType =
      siteTypes.get(
        `${row.id_site}|${row.code_module}|${row.code_presentation}`,
      ) ?? "activity";
    if (existing) existing.clickCount += numberOrNull(row.sum_click) ?? 0;
    else {
      studentActivities.set(key, {
        studentId: 0,
        activityDate: dateOnlyFromOffset(row.date, 0),
        siteName: row.id_site,
        activityType,
        clickCount: numberOrNull(row.sum_click) ?? 0,
      });
    }
    activityByStudent.set(profile.source.id_student, studentActivities);
  }

  const client = await pool.connect();
  const ids = new Map<string, number>();
  try {
    await client.query("BEGIN");
    await clearDemoChildren(client);

    for (const profile of profiles) {
      const registration = registrations.get(sourceKey(profile.source));
      const inserted = await client.query(
        `INSERT INTO students (
          enrollment_number, name, email, department, semester,
          gender, region, highest_education, imd_band, age_band,
          num_of_prev_attempts, studied_credits, disability, registration_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (enrollment_number) DO UPDATE SET
          name = EXCLUDED.name, email = EXCLUDED.email, department = EXCLUDED.department,
          semester = EXCLUDED.semester, gender = EXCLUDED.gender, region = EXCLUDED.region,
          highest_education = EXCLUDED.highest_education, imd_band = EXCLUDED.imd_band,
          age_band = EXCLUDED.age_band, num_of_prev_attempts = EXCLUDED.num_of_prev_attempts,
          studied_credits = EXCLUDED.studied_credits, disability = EXCLUDED.disability,
          registration_date = EXCLUDED.registration_date, updated_at = CURRENT_TIMESTAMP
        RETURNING id;`,
        [
          profile.enrollmentNumber,
          profile.name,
          profile.email,
          profile.department,
          profile.semester,
          profile.source.gender || null,
          profile.source.region || null,
          profile.source.highest_education || null,
          profile.source.imd_band || null,
          profile.source.age_band || null,
          numberOrNull(profile.source.num_of_prev_attempts),
          numberOrNull(profile.source.studied_credits),
          profile.source.disability === "Y",
          dateFromOffset(registration?.date_registration, 0)
            .toISOString()
            .slice(0, 10),
        ],
      );
      const studentId = inserted.rows[0].id as number;
      ids.set(profile.source.id_student, studentId);

      await client.query(
        `INSERT INTO attendance_records (student_id, attendance_percentage, recorded_at)
         VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7);`,
        [
          studentId,
          profile.label === "Withdrawn"
            ? 42
            : profile.label === "Fail"
              ? 58
              : profile.label === "Pass"
                ? 79
                : 93,
          "2026-02-01",
          profile.label === "Withdrawn"
            ? 38
            : profile.label === "Fail"
              ? 54
              : profile.label === "Pass"
                ? 82
                : 95,
          "2026-03-01",
          profile.label === "Withdrawn"
            ? 35
            : profile.label === "Fail"
              ? 49
              : profile.label === "Pass"
                ? 86
                : 97,
          "2026-04-01",
        ],
      );

      const records = assessmentRows.get(profile.source.id_student) ?? [];
      for (const { definition, result } of records) {
        const score = numberOrNull(result.score);
        await client.query(
          `INSERT INTO assessment_records (
             student_id, assessment_name, assessment_type, course_code, semester,
             max_marks, obtained_marks, weight, due_date, submitted_at, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
          [
            studentId,
            `Assessment ${definition.id_assessment}`,
            definition.assessment_type,
            definition.code_module,
            "2026",
            100,
            score,
            numberOrNull(definition.weight) ?? 0,
            dateFromOffset(definition.date, 30),
            score === null ? null : dateFromOffset(result.date_submitted, 30),
            score === null ? "PENDING" : "SUBMITTED",
          ],
        );
      }

      const activities = [
        ...(activityByStudent.get(profile.source.id_student)?.values() ?? []),
      ];
      for (const activity of activities) {
        await client.query(
          `INSERT INTO lms_activity_records (student_id, activity_date, site_name, activity_type, click_count, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [
            studentId,
            activity.activityDate,
            activity.siteName,
            activity.activityType,
            activity.clickCount,
            Math.max(1, Math.round(activity.clickCount * 1.5)),
          ],
        );
      }

      await client.query(
        `INSERT INTO academic_records (student_id, average_marks, backlog_count, assignment_completion, lms_activity, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          studentId,
          profile.label === "Withdrawn"
            ? 34
            : profile.label === "Fail"
              ? 47
              : profile.label === "Pass"
                ? 72
                : 88,
          profile.label === "Withdrawn"
            ? 4
            : profile.label === "Fail"
              ? 2
              : profile.label === "Pass"
                ? 1
                : 0,
          profile.label === "Withdrawn"
            ? 35
            : profile.label === "Fail"
              ? 55
              : profile.label === "Pass"
                ? 82
                : 96,
          profile.label === "Withdrawn"
            ? 30
            : profile.label === "Fail"
              ? 48
              : profile.label === "Pass"
                ? 76
                : 94,
          "2026-04-01",
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return ids;
}

async function main(): Promise<void> {
  console.log(
    "Seeding ARAMBH ASCEND demo data from the supplied ML dataset...",
  );
  const profiles = selectProfiles(
    readSmallCsv("studentInfo.csv") as SourceProfile[],
  );
  console.log(
    `Selected ${profiles.length} source profiles: ${profiles.filter((p) => p.label === "Withdrawn").length} Withdrawn, ${profiles.filter((p) => p.label === "Fail").length} Fail, ${profiles.filter((p) => p.label === "Pass").length} Pass, ${profiles.filter((p) => p.label === "Distinction").length} Distinction`,
  );

  const ids = await seedBaseData(profiles);
  const admin = await upsertUser(
    DEMO_USERS[0].name,
    DEMO_USERS[0].email,
    DEMO_USERS[0].role,
  );
  const faculty = await upsertUser(
    DEMO_USERS[1].name,
    DEMO_USERS[1].email,
    DEMO_USERS[1].role,
  );
  const counselor = await upsertUser(
    DEMO_USERS[2].name,
    DEMO_USERS[2].email,
    DEMO_USERS[2].role,
  );
  const demoStudentId = ids.get(profiles[0].source.id_student)!;
  const studentUser = await upsertUser(
    "Arambh Demo Student",
    "student@arambh.demo",
    "STUDENT",
    demoStudentId,
  );

  await pool.query(
    `DELETE FROM notifications WHERE user_id = $1 AND type = 'INFO' AND title = 'Welcome to Arambh Ascend Demo';`,
    [studentUser.id],
  );
  await createNotification({
    userId: studentUser.id,
    type: "INFO",
    title: "Welcome to Arambh Ascend Demo",
    message: "Your student dashboard is linked to the ARAMBH-DEMO-01 profile.",
  });

  const predictions: Array<{
    studentId: number;
    riskLevel: string;
    riskProbability: number;
  }> = [];
  const generatedInterventions: Array<{
    id: number;
    status: InterventionStatus;
  }> = [];
  let analysisCount = 0;
  let interventionCount = 0;

  for (let index = 0; index < profiles.length; index += 1) {
    const studentId = ids.get(profiles[index].source.id_student)!;
    const actorId =
      index % 3 === 0 ? admin.id : index % 3 === 1 ? faculty.id : counselor.id;
    const result = await predictStudent(studentId, actorId);
    predictions.push({
      studentId,
      riskLevel: result.prediction.risk_level,
      riskProbability: result.prediction.risk_probability,
    });
    const analysis = await analyzeStudentRisk(studentId, actorId);
    analysisCount += 1;

    if (
      result.prediction.risk_level !== "LOW" ||
      analysis.alert.alert_level !== "NORMAL"
    ) {
      const generated = await generateInterventions(studentId, counselor.id);
      interventionCount += generated.created.length;
      for (const intervention of generated.created)
        generatedInterventions.push({
          id: intervention.id,
          status: intervention.status,
        });
    }
  }

  for (let index = 0; index < generatedInterventions.length; index += 1) {
    const intervention = generatedInterventions[index];
    if (index % 3 === 0 && intervention.status === "RECOMMENDED") {
      await updateInterventionStatus(intervention.id, "ASSIGNED", counselor.id);
      await updateInterventionStatus(
        intervention.id,
        "IN_PROGRESS",
        counselor.id,
      );
    } else if (index % 3 === 1 && intervention.status === "RECOMMENDED") {
      await updateInterventionStatus(intervention.id, "ASSIGNED", counselor.id);
      await updateInterventionStatus(
        intervention.id,
        "IN_PROGRESS",
        counselor.id,
      );
      await updateInterventionStatus(
        intervention.id,
        "EVALUATED",
        counselor.id,
      );
    }
  }

  const riskCounts = predictions.reduce<Record<string, number>>(
    (counts, prediction) => {
      counts[prediction.riskLevel] = (counts[prediction.riskLevel] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const counts = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM students WHERE enrollment_number LIKE $1) AS students,
      (SELECT COUNT(*)::int FROM predictions WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1)) AS predictions,
      (SELECT COUNT(*)::int FROM alerts WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1)) AS alerts,
      (SELECT COUNT(*)::int FROM interventions WHERE student_id IN (SELECT id FROM students WHERE enrollment_number LIKE $1)) AS interventions,
      (SELECT COUNT(*)::int FROM notifications WHERE user_id = ANY($2::int[])) AS notifications;`,
    [`${DEMO_PREFIX}%`, [admin.id, faculty.id, counselor.id, studentUser.id]],
  );

  console.log(
    JSON.stringify(
      {
        students: counts.rows[0].students,
        predictions: counts.rows[0].predictions,
        riskCounts,
        ml2Analyses: analysisCount,
        alerts: counts.rows[0].alerts,
        interventions: counts.rows[0].interventions,
        newlyGeneratedInterventions: interventionCount,
        notifications: counts.rows[0].notifications,
        credentials: {
          admin: { email: "admin@arambh.demo", password: DEMO_PASSWORD },
          faculty: { email: "faculty@arambh.demo", password: DEMO_PASSWORD },
          counselor: {
            email: "counselor@arambh.demo",
            password: DEMO_PASSWORD,
          },
          student: {
            email: "student@arambh.demo",
            password: DEMO_PASSWORD,
            studentId: demoStudentId,
          },
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
