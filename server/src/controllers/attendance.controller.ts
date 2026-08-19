import { Request, Response, NextFunction } from 'express';
import AttendanceRepository from '../repositories/attendance.repository.js';
import StudentRepository from '../repositories/student.repository.js';
import { studentIdParamSchema, paginationQuerySchema } from '../validators/student.validator.js';

// @desc    Add a new attendance record for a student
// @route   POST /api/students/:id/attendance
// @access  Private (ADMIN, FACULTY only)
export const createRecord = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);
    const { attendancePercentage, recordedAt } = req.body;

    // Verify student exists
    const student = await StudentRepository.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Insert record
    const record = await AttendanceRepository.create({
      studentId,
      attendancePercentage,
      recordedAt
    });

    res.status(201).json({
      success: true,
      message: 'Attendance record added successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance history for a student
// @route   GET /api/students/:id/attendance
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getHistory = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);
    const parsedQuery = paginationQuerySchema.parse(req.query);
    const { page, limit } = parsedQuery;
    const offset = (page - 1) * limit;

    // Verify student exists
    const student = await StudentRepository.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const totalRecords = await AttendanceRepository.countByStudentId(studentId);
    const history = await AttendanceRepository.findByStudentId({ studentId, limit, offset });

    res.status(200).json({
      success: true,
      message: 'Attendance history fetched successfully',
      data: {
        attendance: history
      },
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
