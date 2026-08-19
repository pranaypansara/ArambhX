export interface AttendanceRecord {
  id: number;
  studentId: number;
  attendancePercentage: number | string;
  recordedAt: Date;
  createdAt: Date;
}

export interface AttendanceInput {
  attendancePercentage: number;
  recordedAt?: string | null;
}
