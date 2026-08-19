import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/user.repository.js';
import { UserPayload } from '../types/auth.types.js';

interface DecodedToken {
  id: number;
  [key: string]: any;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretfallback') as DecodedToken;

      // Fetch user profile from the database using raw SQL repository
      const user = await UserRepository.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      // Attach authenticated user information
      req.user = user as UserPayload;
      next();
    } catch (error: any) {
      console.error('[Auth Middleware] JWT Verification Error:', error.message);
      return next(error);
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};
