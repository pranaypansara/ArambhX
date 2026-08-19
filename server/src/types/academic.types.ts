export interface AcademicRecord {
  id: number;
  studentId: number;
  averageMarks: number | string;
  backlogCount: number;
  assignmentCompletion: number | string;
  lmsActivity: number | string;
  recordedAt: Date;
  createdAt: Date;
}

export interface AcademicInput {
  averageMarks: number;
  backlogCount: number;
  assignmentCompletion: number;
  lmsActivity: number;
  recordedAt?: string | null;
}
