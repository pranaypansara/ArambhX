import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/user.repository.js';

const generateToken = (userId: number): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'secretfallback',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in the database via raw SQL Repository
    const user = await UserRepository.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user and return JWT
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Sign token
    const token = generateToken(user.id);

    // Prepare safe user object (remove password)
    const { password: _, ...safeUser } = user;
    const userAny = user as any;
    
    // Map database snake_case metadata to camelCase response formatting
    const formattedUser = {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role,
      createdAt: userAny.created_at || safeUser.createdAt,
      updatedAt: userAny.updated_at || safeUser.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: formattedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};
