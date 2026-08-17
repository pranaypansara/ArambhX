import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// Public Routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Private Routes
router.get('/me', protect, getCurrentUser);

export default router;
