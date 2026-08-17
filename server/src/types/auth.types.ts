export type UserRole = 'ADMIN' | 'FACULTY' | 'COUNSELOR';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
