import pool from '../config/db.js';
import { Student, StudentInput } from '../types/student.types.js';

class StudentRepository {
  // Find student by ID (returns profile)
  async findById(id: number): Promise<Student | null> {
    const query = {
      text: `
        SELECT id, enrollment_number AS "enrollmentNumber", name, email, department, semester, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM students
        WHERE id = $1;
      `,
      values: [id]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as Student) || null;
  }

  // Find student by enrollment number
  async findByEnrollmentNumber(enrollmentNumber: string): Promise<{ id: number; enrollmentNumber: string } | null> {
    const query = {
      text: 'SELECT id, enrollment_number AS "enrollmentNumber" FROM students WHERE enrollment_number = $1;',
      values: [enrollmentNumber.trim()]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as { id: number; enrollmentNumber: string }) || null;
  }

  // Find student by email
  async findByEmail(email: string | null | undefined): Promise<{ id: number; email: string } | null> {
    if (!email) return null;
    const query = {
      text: 'SELECT id, email FROM students WHERE email = $1;',
      values: [email.toLowerCase().trim()]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as { id: number; email: string }) || null;
  }

  // Get paginated list of students
  async findAll({ limit, offset }: { limit: number; offset: number }): Promise<Student[]> {
    const query = {
      text: `
        SELECT id, enrollment_number AS "enrollmentNumber", name, email, department, semester, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM students
        ORDER BY enrollment_number ASC
        LIMIT $1 OFFSET $2;
      `,
      values: [limit, offset]
    };
    const { rows } = await pool.query(query);
    return rows as Student[];
  }

  // Count total students
  async countAll(): Promise<number> {
    const { rows } = await pool.query('SELECT COUNT(*) FROM students;');
    return parseInt(rows[0].count, 10);
  }

  // Create new student
  async create({ enrollmentNumber, name, email, department, semester }: StudentInput): Promise<Student> {
    const emailVal = email && email.trim() !== '' ? email.toLowerCase().trim() : null;
    const query = {
      text: `
        INSERT INTO students (enrollment_number, name, email, department, semester)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, enrollment_number AS "enrollmentNumber", name, email, department, semester, created_at AS "createdAt", updated_at AS "updatedAt";
      `,
      values: [enrollmentNumber.trim(), name.trim(), emailVal, department.trim(), semester]
    };
    const { rows } = await pool.query(query);
    return rows[0] as Student;
  }

  // Update student profile dynamically and safely using parameterization
  async update(id: number, fields: Partial<StudentInput>): Promise<Student | null> {
    const keys = Object.keys(fields) as Array<keyof StudentInput>;
    if (keys.length === 0) return this.findById(id);

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Strict whitelist mapping of camelCase properties to snake_case database columns
    const allowedMappings: Record<keyof StudentInput, string> = {
      enrollmentNumber: 'enrollment_number',
      name: 'name',
      email: 'email',
      department: 'department',
      semester: 'semester'
    };

    for (const key of keys) {
      if (allowedMappings[key] !== undefined) {
        setClause.push(`${allowedMappings[key]} = $${paramIndex}`);
        
        let value = fields[key];
        if (key === 'email') {
          value = value && typeof value === 'string' && value.trim() !== '' ? value.toLowerCase().trim() : null;
        } else if (typeof value === 'string') {
          value = value.trim();
        }
        
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) return this.findById(id);

    // Set updated_at column timestamp
    setClause.push('updated_at = CURRENT_TIMESTAMP');

    // Add ID parameter to the end of the values list
    values.push(id);
    const idIndex = paramIndex;

    const query = {
      text: `
        UPDATE students
        SET ${setClause.join(', ')}
        WHERE id = $${idIndex}
        RETURNING id, enrollment_number AS "enrollmentNumber", name, email, department, semester, created_at AS "createdAt", updated_at AS "updatedAt";
      `,
      values
    };

    const { rows } = await pool.query(query);
    return (rows[0] as Student) || null;
  }

  // Delete student profile (and cascade records in DB)
  async delete(id: number): Promise<{ id: number } | null> {
    const query = {
      text: 'DELETE FROM students WHERE id = $1 RETURNING id;',
      values: [id]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as { id: number }) || null;
  }
}

export default new StudentRepository();
