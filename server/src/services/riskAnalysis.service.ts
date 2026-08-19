import StudentRepository from '../repositories/student.repository.js';
import PredictionRepository from '../repositories/prediction.repository.js';
import { buildMLFeatures } from './mlFeatureBuilder.service.js';
import { ml2Client } from './ml2Client.service.js';
import { StudentNotFoundError } from './prediction.service.js';
import {
  ML2AnalysisResponse,
  ML2RiskHistoryPoint
} from '../types/ml2.types.js';

/**
 * ML2 risk-intelligence orchestration for a single student.
 *
 * Flow:
 *   1. Confirm the student exists (existing repository).
 *   2. Build the exact ML1 feature payload (Phase 3 builder — single source).
 *   3. Read the stored risk snapshots from the `predictions` table and convert
 *      them to chronological order, because the ML2 trend engine expects the
 *      snapshot sequence ordered oldest -> newest.
 *   4. Send the features + risk history to FastAPI `POST /ml2/analyze` through
 *      the dedicated ML2 client.
 *   5. Return the validated ML2 result (trend, alert, recommendations).
 */
export const analyzeStudentRisk = async (studentId: number): Promise<ML2AnalysisResponse> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }

  const features = await buildMLFeatures(studentId);
  if (!features) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }

  // Newest-first from the DB; the ML2 trend engine needs oldest -> newest.
  const history = await PredictionRepository.findByStudentId(studentId, 50);
  const risk_history: ML2RiskHistoryPoint[] = history
    .slice()
    .reverse()
    .map((row) => ({
      risk_probability: row.riskProbability,
      predicted_at: row.predictedAt.toISOString()
    }));

  return ml2Client.analyze({
    student_id: studentId,
    features,
    risk_history
  });
};