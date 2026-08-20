import pool from "../config/db.js";
import { hashPassword } from "../services/auth.service.js";

const DEMO_PASSWORD = "ArambhDemo!2026";

const users = [
  ["Arambh Demo Admin", "admin@arambh.demo", "ADMIN"],
  ["Arambh Demo Faculty", "faculty@arambh.demo", "FACULTY"],
  ["Arambh Demo Counselor", "counselor@arambh.demo", "COUNSELOR"],
] as const;

async function main(): Promise<void> {
  const student = await pool.query<{ id: number }>(
    `SELECT s.id
       FROM students s
       LEFT JOIN users u ON u.student_id = s.id
       WHERE u.id IS NULL
       ORDER BY s.id
       LIMIT 1;`,
  );
  if (!student.rows[0]) {
    throw new Error(
      "Cannot create student@arambh.demo because no student record exists.",
    );
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const [name, email, role] of users) {
    await pool.query(
      `INSERT INTO users (name, email, password, role, student_id)
       VALUES ($1, $2, $3, $4, NULL)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         role = EXCLUDED.role,
         student_id = NULL,
         updated_at = CURRENT_TIMESTAMP;`,
      [name, email, passwordHash, role],
    );
  }

  await pool.query(
    `INSERT INTO users (name, email, password, role, student_id)
     VALUES ($1, $2, $3, 'STUDENT', $4)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password = EXCLUDED.password,
       role = EXCLUDED.role,
       student_id = EXCLUDED.student_id,
       updated_at = CURRENT_TIMESTAMP;`,
    [
      "Arambh Demo Student",
      "student@arambh.demo",
      passwordHash,
      student.rows[0].id,
    ],
  );

  console.log(
    JSON.stringify(
      {
        password: DEMO_PASSWORD,
        studentId: student.rows[0].id,
        accounts: [
          { role: "ADMIN", email: "admin@arambh.demo" },
          { role: "FACULTY", email: "faculty@arambh.demo" },
          { role: "COUNSELOR", email: "counselor@arambh.demo" },
          { role: "STUDENT", email: "student@arambh.demo" },
        ],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Demo user reset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
