import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { register, createUser, loginUser, getCurrentUser } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema, createUserSchema } from '../validators/auth.validator.js';

const router = Router();

// Simple in-memory rate limit on credential endpoints (brute-force guard).
// No Redis, no distributed state — appropriate for a hackathon MVP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max 20 requests per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  }
});

// Public routes (rate limited)
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), loginUser);

// ADMIN-only bootstrap route for privileged roles (COUNSELLOR, ADMIN) and
// explicitly linked STUDENT accounts. Public registration can never mint these.
router.post(
  '/admin/create-user',
  protect,
  authorize('ADMIN'),
  validate(createUserSchema),
  createUser
);

// Private route
router.get('/me', protect, getCurrentUser);

export default router;