import { Request, Response, NextFunction } from 'express';
import {
  registerPublic,
  adminCreateUser,
  login,
  InvalidCredentialsError,
  EmailAlreadyRegisteredError,
  InvalidStudentLinkError,
  MissingStudentLinkError
} from '../services/auth.service.js';
import { UserRole } from '../types/auth.types.js';

// @desc    Register a public user (FACULTY staff default, or linked STUDENT)
// @route   POST /api/auth/register
// @access  Public (role is server-derived — never client-provided)
export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await registerPublic({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      studentId: req.body.studentId ?? null
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error instanceof InvalidStudentLinkError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    ADMIN-only account creation (privileged roles + linked students)
// @route   POST /api/auth/admin/create-user
// @access  Private (ADMIN)
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await adminCreateUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role as UserRole,
      studentId: req.body.studentId ?? null
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error instanceof InvalidStudentLinkError || error instanceof MissingStudentLinkError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Authenticate user and return JWT + safe profile
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { token, user } = await login({
      email: req.body.email,
      password: req.body.password
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get the authenticated user's safe profile
// @route   GET /api/auth/me
// @access  Private (any authenticated user)
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};