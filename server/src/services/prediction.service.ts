import StudentRepository from '../repositories/student.repository.js';
import PredictionRepository from '../repositories/prediction.repository.js';
import { buildMLFeatures } from './mlFeatureBuilder.service.js';
import { mlPredictionClient } from './mlPredictionClient.service.js';
import { MLPredictionResult } from '../types/prediction.types.js';
import { StoredPrediction } from '../repositories/prediction.repository.js';

/**
 * Orchestrates a single student prediction and persists the result.
 *
 * Flow:
 *   1. Confirm the student exists (existing repository).
 *   2. Build the exact ML1 feature payload (Phase 3 builder — single source).
 *   3. Send the payload to FastAPI through the dedicated ML client.
 *   4. Persist the exact ML result in PostgreSQL.
 *   5. Return the prediction with storage metadata.
 */
export const predictStudent = async (studentId: number): Promise<{
  studentId: number;
  prediction: MLPredictionResult;
  stored: StoredPrediction;
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

  // Persist the exact ML result (Phase 7)
  const stored = await PredictionRepository.save({
    studentId,
    prediction
  });

  return { studentId, prediction, stored };
};

export class StudentNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(studentId: number) {
    super(`Student with id ${studentId} not found`);
    this.name = 'StudentNotFoundError';
  }
}

/**
 * Retrieve prediction history for a student.
 */
export const getPredictionHistory = async (
  studentId: number,
  limit: number = 50
): Promise<StoredPrediction[]> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }
  return PredictionRepository.findByStudentId(studentId, limit);
};

/**
 * Retrieve the latest prediction for a student.
 * Returns null if the student exists but has no predictions.
 */
export const getLatestPrediction = async (
  studentId: number
): Promise<StoredPrediction | null> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }
  return PredictionRepository.findLatestByStudentId(studentId);
};