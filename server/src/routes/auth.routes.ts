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
// The window/limit are env-configurable; production keeps the strict default
// while development (and the integration suite) gets a more generous budget.
const isProd = process.env.NODE_ENV === 'production';
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX ?? (isProd ? 20 : 200)),
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