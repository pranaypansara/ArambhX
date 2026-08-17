import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/user.repository.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretfallback');

      // Fetch user profile from the database using raw SQL repository
      const user = await UserRepository.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      // Attach authenticated user information
      req.user = user;
      next();
    } catch (error) {
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
