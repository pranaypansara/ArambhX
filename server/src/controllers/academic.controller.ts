import { Request, Response, NextFunction } from 'express';
import AcademicRepository from '../repositories/academic.repository.js';
import StudentRepository from '../repositories/student.repository.js';
import { studentIdParamSchema, paginationQuerySchema } from '../validators/student.validator.js';

// @desc    Add a new academic record for a student
// @route   POST /api/students/:id/academic-records
// @access  Private (ADMIN, FACULTY only)
export const createRecord = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);
    const { averageMarks, backlogCount, assignmentCompletion, lmsActivity, recordedAt } = req.body;

    // Verify student exists
    const student = await StudentRepository.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Insert record
    const record = await AcademicRepository.create({
      studentId,
      averageMarks,
      backlogCount,
      assignmentCompletion,
      lmsActivity,
      recordedAt
    });

    res.status(201).json({
      success: true,
      message: 'Academic record added successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get academic records history for a student
// @route   GET /api/students/:id/academic-records
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

    const totalRecords = await AcademicRepository.countByStudentId(studentId);
    const history = await AcademicRepository.findByStudentId({ studentId, limit, offset });

    res.status(200).json({
      success: true,
      message: 'Academic history fetched successfully',
      data: {
        academicRecords: history
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
