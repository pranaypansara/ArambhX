export interface Student {
  id: number;
  enrollmentNumber: string;
  name: string;
  email: string | null;
  department: string;
  semester: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentInput {
  enrollmentNumber: string;
  name: string;
  email?: string | null;
  department: string;
  semester: number;
}
