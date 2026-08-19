import { Router } from 'express';
import { getMLHealth } from '../controllers/ml.controller.js';

const router = Router();

// Phase 6: proxy to the independent FastAPI ML service health endpoint.
router.get('/health', getMLHealth);

export default router;