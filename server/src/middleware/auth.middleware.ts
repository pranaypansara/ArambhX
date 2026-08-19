import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/user.repository.js';
import { UserPayload } from '../types/auth.types.js';
import { getJwtSecret } from '../config/auth.js';

interface DecodedToken {
  id?: unknown;
}

/**
 * JWT authentication middleware.
 *
 * Responsibilities:
 *   1. Read the Bearer token from the Authorization header.
 *   2. Validate token presence and header format.
 *   3. Verify + decode the JWT.
 *   4. Validate the payload contains a usable user id.
 *   5. Reload the authoritative user profile from the database (never trust
 *      stale token claims for roles/links) and attach it to req.user.
 *
 * Missing/malformed headers, invalid tokens and expired tokens all produce the
 * 401 convention. JWT internals are never exposed to the client.
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  if (!header.startsWith('Bearer ') || header.trim() === 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, malformed Authorization header'
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;

    if (typeof decoded.id !== 'number' || !Number.isInteger(decoded.id) || decoded.id <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token payload'
      });
    }

    // Reload the authoritative user (role + student link can change).
    const user = await UserRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    req.user = user as UserPayload;
    next();
  } catch (error: any) {
    console.error('[Auth Middleware] JWT Verification Error:', error?.message);
    return next(error);
  }
};