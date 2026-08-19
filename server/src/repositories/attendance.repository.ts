import pool from '../config/db.js';
import { AttendanceRecord } from '../types/attendance.types.js';

class AttendanceRepository {
  // Insert a new attendance record
  async create({ studentId, attendancePercentage, recordedAt }: { studentId: number; attendancePercentage: number; recordedAt?: string | null }): Promise<AttendanceRecord> {
    const recordedVal = recordedAt ? new Date(recordedAt) : null;
    const query = {
      text: `
        INSERT INTO attendance_records (student_id, attendance_percentage, recorded_at)
        VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP))
        RETURNING id, student_id AS "studentId", attendance_percentage AS "attendancePercentage", recorded_at AS "recordedAt", created_at AS "createdAt";
      `,
      values: [studentId, attendancePercentage, recordedVal]
    };
    const { rows } = await pool.query(query);
    return rows[0] as AttendanceRecord;
  }

  // Find historical records for a student with pagination support
  async findByStudentId({ studentId, limit, offset }: { studentId: number; limit: number; offset: number }): Promise<AttendanceRecord[]> {
    const query = {
      text: `
        SELECT id, attendance_percentage AS "attendancePercentage", recorded_at AS "recordedAt", created_at AS "createdAt"
        FROM attendance_records
        WHERE student_id = $1
        ORDER BY recorded_at DESC
        LIMIT $2 OFFSET $3;
      `,
      values: [studentId, limit, offset]
    };
    const { rows } = await pool.query(query);
    return rows as AttendanceRecord[];
  }

  // Count total records for a student
  async countByStudentId(studentId: number): Promise<number> {
    const query = {
      text: 'SELECT COUNT(*) FROM attendance_records WHERE student_id = $1;',
      values: [studentId]
    };
    const { rows } = await pool.query(query);
    return parseInt(rows[0].count, 10);
  }

  // Get the single latest attendance record
  async getLatestByStudentId(studentId: number): Promise<{ attendancePercentage: number | string; recordedAt: Date } | null> {
    const query = {
      text: `
        SELECT attendance_percentage AS "attendancePercentage", recorded_at AS "recordedAt"
        FROM attendance_records
        WHERE student_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1;
      `,
      values: [studentId]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as { attendancePercentage: number | string; recordedAt: Date }) || null;
  }
}

export default new AttendanceRepository();
