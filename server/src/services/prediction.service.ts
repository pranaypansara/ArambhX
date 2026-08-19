import StudentRepository from '../repositories/student.repository.js';
import { buildMLFeatures } from './mlFeatureBuilder.service.js';
import { mlPredictionClient } from './mlPredictionClient.service.js';
import { MLPredictionResult } from '../types/prediction.types.js';

/**
 * Orchestrates a single student prediction without duplicating existing logic:
 *
 *   1. Confirm the student exists (existing repository).
 *   2. Build the exact ML1 feature payload (Phase 3 builder — single source).
 *   3. Send the payload to FastAPI through the dedicated ML client.
 *
 * No prediction is stored anywhere — persistence belongs to a later phase.
 */
export const predictStudent = async (studentId: number): Promise<{
  studentId: number;
  prediction: MLPredictionResult;
}> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }

  const features = await buildMLFeatures(studentId);
  if (!features) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }

  const prediction = await mlPredictionClient.predict(features);

  return { studentId, prediction };
};

export class StudentNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(studentId: number) {
    super(`Student with id ${studentId} not found`);
    this.name = 'StudentNotFoundError';
  }
}