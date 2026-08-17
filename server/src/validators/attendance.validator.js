import { z } from 'zod';

export const createAttendanceSchema = z.object({
  attendancePercentage: z.coerce.number({ required_error: 'Attendance percentage is required' })
    .min(0, { message: 'Attendance percentage cannot be less than 0' })
    .max(100, { message: 'Attendance percentage cannot exceed 100' }),
  recordedAt: z.string()
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'recordedAt must be a valid date or timestamp string' })
    .optional()
});
