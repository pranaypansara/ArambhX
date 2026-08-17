import pool from '../config/db.js';

class AcademicRepository {
  // Insert a new academic record
  async create({ studentId, averageMarks, backlogCount, assignmentCompletion, lmsActivity, recordedAt }) {
    const recordedVal = recordedAt ? new Date(recordedAt) : null;
    const query = {
      text: `
        INSERT INTO academic_records (
          student_id, average_marks, backlog_count, assignment_completion, lms_activity, recorded_at
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP))
        RETURNING 
          id, 
          student_id AS "studentId", 
          average_marks AS "averageMarks", 
          backlog_count AS "backlogCount", 
          assignment_completion AS "assignmentCompletion", 
          lms_activity AS "lmsActivity", 
          recorded_at AS "recordedAt", 
          created_at AS "createdAt";
      `,
      values: [studentId, averageMarks, backlogCount, assignmentCompletion, lmsActivity, recordedVal]
    };
    const { rows } = await pool.query(query);
    return rows[0];
  }

  // Find historical records for a student with pagination support
  async findByStudentId({ studentId, limit, offset }) {
    const query = {
      text: `
        SELECT 
          id, 
          average_marks AS "averageMarks", 
          backlog_count AS "backlogCount", 
          assignment_completion AS "assignmentCompletion", 
          lms_activity AS "lmsActivity", 
          recorded_at AS "recordedAt", 
          created_at AS "createdAt"
        FROM academic_records
        WHERE student_id = $1
        ORDER BY recorded_at DESC
        LIMIT $2 OFFSET $3;
      `,
      values: [studentId, limit, offset]
    };
    const { rows } = await pool.query(query);
    return rows;
  }

  // Count total records for a student
  async countByStudentId(studentId) {
    const query = {
      text: 'SELECT COUNT(*) FROM academic_records WHERE student_id = $1;',
      values: [studentId]
    };
    const { rows } = await pool.query(query);
    return parseInt(rows[0].count, 10);
  }

  // Get the single latest academic record
  async getLatestByStudentId(studentId) {
    const query = {
      text: `
        SELECT 
          average_marks AS "averageMarks", 
          backlog_count AS "backlogCount", 
          assignment_completion AS "assignmentCompletion", 
          lms_activity AS "lmsActivity", 
          recorded_at AS "recordedAt"
        FROM academic_records
        WHERE student_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1;
      `,
      values: [studentId]
    };
    const { rows } = await pool.query(query);
    return rows[0] || null;
  }
}

export default new AcademicRepository();
