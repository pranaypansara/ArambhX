import pool from '../config/db.js';
import { User, UserPayload } from '../types/auth.types.js';

class UserRepository {
  // Find user by email (includes the password hash for login verification).
  // Returns a camelCase User (studentId included when linked).
  async findByEmail(email: string): Promise<User | null> {
    const query = {
      text: `
        SELECT
          id,
          name,
          email,
          password,
          role,
          student_id AS "studentId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM users
        WHERE email = $1;
      `,
      values: [email.toLowerCase().trim()]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as User) || null;
  }

  // Find user by ID (excluding password; includes student_id linkage)
  async findById(id: number): Promise<UserPayload | null> {
    const query = {
      text: `
        SELECT
          id,
          name,
          email,
          role,
          student_id AS "studentId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM users
        WHERE id = $1;
      `,
      values: [id]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as UserPayload) || null;
  }

  // Create a new user. role is always provided by the service (never derived
  // from an unvalidated client value), and student_id is set only for linked
  // STUDENT accounts.
  async create({
    name,
    email,
    password,
    role,
    studentId
  }: {
    name: string;
    email: string;
    password: string;
    role: import('../types/auth.types.js').UserRole;
    studentId?: number | null;
  }): Promise<UserPayload> {
    const query = {
      text: `
        INSERT INTO users (name, email, password, role, student_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          name,
          email,
          role,
          student_id AS "studentId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
      `,
      values: [
        name.trim(),
        email.toLowerCase().trim(),
        password,
        role,
        studentId ?? null
      ]
    };
    const { rows } = await pool.query(query);
    return rows[0] as UserPayload;
  }
}

export default new UserRepository();