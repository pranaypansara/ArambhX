import { Request, Response, NextFunction } from 'express';
import StudentRepository from '../repositories/student.repository.js';
import AttendanceRepository from '../repositories/attendance.repository.js';
import AcademicRepository from '../repositories/academic.repository.js';
import { studentIdParamSchema, paginationQuerySchema } from '../validators/student.validator.js';

// @desc    Create a new student profile
// @route   POST /api/students
// @access  Private (ADMIN only)
export const createStudent = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { enrollmentNumber, name, email, department, semester } = req.body;

    // Check duplicate enrollment number
    const existingEnrollment = await StudentRepository.findByEnrollmentNumber(enrollmentNumber);
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'A student with this enrollment number already exists'
      });
    }

    // Check duplicate email (if provided)
    if (email && email.trim() !== '') {
      const existingEmail = await StudentRepository.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'A student with this email address already exists'
        });
      }
    }

    // Insert student
    const student = await StudentRepository.create({
      enrollmentNumber,
      name,
      email,
      department,
      semester
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all students (with pagination)
// @route   GET /api/students
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getAllStudents = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Validate pagination query arguments
    const parsedQuery = paginationQuerySchema.parse(req.query);
    const { page, limit } = parsedQuery;
    const offset = (page - 1) * limit;

    const totalStudents = await StudentRepository.countAll();
    const students = await StudentRepository.findAll({ limit, offset });

    res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: {
        students
      },
      pagination: {
        page,
        limit,
        totalStudents,
        totalPages: Math.ceil(totalStudents / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Validate student ID path parameter
    const { id } = studentIdParamSchema.parse(req.params);

    const student = await StudentRepository.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student fetched successfully',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update student profile dynamically
// @route   PATCH /api/students/:id
// @access  Private (ADMIN only)
export const updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = studentIdParamSchema.parse(req.params);
    const fieldsToUpdate = req.body;

    // Check student existence
    const student = await StudentRepository.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check unique constraints if modifying enrollmentNumber
    if (fieldsToUpdate.enrollmentNumber && fieldsToUpdate.enrollmentNumber !== student.enrollmentNumber) {
      const existingEnrollment = await StudentRepository.findByEnrollmentNumber(fieldsToUpdate.enrollmentNumber);
      if (existingEnrollment && existingEnrollment.id !== id) {
        return res.status(400).json({
          success: false,
          message: 'A student with this enrollment number already exists'
        });
      }
    }

    // Check unique constraints if modifying email
    if (fieldsToUpdate.email && fieldsToUpdate.email.trim() !== '') {
      const existingEmail = await StudentRepository.findByEmail(fieldsToUpdate.email);
      if (existingEmail && existingEmail.id !== id) {
        return res.status(400).json({
          success: false,
          message: 'A student with this email address already exists'
        });
      }
    }

    // Perform partial update
    const updatedStudent = await StudentRepository.update(id, fieldsToUpdate);

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete student profile (triggers cascading deletes)
// @route   DELETE /api/students/:id
// @access  Private (ADMIN only)
export const deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = studentIdParamSchema.parse(req.params);

    // Check student existence
    const student = await StudentRepository.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Delete student
    await StudentRepository.delete(id);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student summary (profile + latest attendance & academic record)
// @route   GET /api/students/:id/summary
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getStudentSummary = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);

    // 1. Fetch student
    const student = await StudentRepository.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // 2. Fetch latest attendance record
    const latestAttendance = await AttendanceRepository.getLatestByStudentId(studentId);

    // 3. Fetch latest academic record
    const latestAcademic = await AcademicRepository.getLatestByStudentId(studentId);

    // Map database output keys to clean camelCase response formatting
    let formattedAttendance = null;
    if (latestAttendance) {
      formattedAttendance = {
        attendancePercentage: typeof latestAttendance.attendancePercentage === 'number'
          ? latestAttendance.attendancePercentage
          : parseFloat(latestAttendance.attendancePercentage),
        recordedAt: latestAttendance.recordedAt
      };
    }

    let formattedAcademic = null;
    if (latestAcademic) {
      formattedAcademic = {
        averageMarks: latestAcademic.averageMarks
          ? (typeof latestAcademic.averageMarks === 'number' ? latestAcademic.averageMarks : parseFloat(latestAcademic.averageMarks as string))
          : null,
        backlogCount: latestAcademic.backlogCount,
        assignmentCompletion: latestAcademic.assignmentCompletion
          ? (typeof latestAcademic.assignmentCompletion === 'number' ? latestAcademic.assignmentCompletion : parseFloat(latestAcademic.assignmentCompletion as string))
          : null,
        lmsActivity: latestAcademic.lmsActivity
          ? (typeof latestAcademic.lmsActivity === 'number' ? latestAcademic.lmsActivity : parseFloat(latestAcademic.lmsActivity as string))
          : null,
        recordedAt: latestAcademic.recordedAt
      };
    }

    res.status(200).json({
      success: true,
      message: 'Student summary fetched successfully',
      data: {
        student,
        latestAttendance: formattedAttendance,
        latestAcademicRecord: formattedAcademic
      }
    });
  } catch (error) {
    next(error);
  }
};
