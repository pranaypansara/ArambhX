import pool from '../config/db.js';
import { MLPredictionResult } from '../types/prediction.types.js';

/**
 * Stored prediction row as returned from the `predictions` table.
 */
export interface StoredPrediction {
  id: number;
  studentId: number;
  riskProbability: number;
  riskLevel: string;
  modelVersion: string | null;
  predictedAt: Date;
}

/**
 * Input for saving a new prediction.
 */
export interface SavePredictionInput {
  studentId: number;
  prediction: MLPredictionResult;
}

/**
 * Repository for prediction persistence.
 * Uses the existing `predictions` table which already has the required schema
 * and an index on (student_id, predicted_at DESC) for efficient history queries.
 */
class PredictionRepository {
  /**
   * Save a prediction result to the database.
   * Returns the saved prediction with its assigned ID and timestamp.
   */
  async save(input: SavePredictionInput): Promise<StoredPrediction> {
    const { studentId, prediction } = input;

    const query = {
      text: `
        INSERT INTO predictions (
          student_id, risk_probability, risk_level, model_version
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          student_id AS "studentId",
          risk_probability AS "riskProbability",
          risk_level AS "riskLevel",
          model_version AS "modelVersion",
          predicted_at AS "predictedAt"
      `,
      values: [
        studentId,
        prediction.risk_probability,
        prediction.risk_level,
        prediction.model
      ]
    };

    const { rows } = await pool.query(query);
    return rows[0] as StoredPrediction;
  }

  /**
   * Retrieve prediction history for a student, ordered newest first.
   * Optional limit for pagination (default 50, max 200).
   */
  async findByStudentId(
    studentId: number,
    limit: number = 50
  ): Promise<StoredPrediction[]> {
    const safeLimit = Math.min(Math.max(1, limit), 200);

    const query = {
      text: `
        SELECT
          id,
          student_id AS "studentId",
          risk_probability AS "riskProbability",
          risk_level AS "riskLevel",
          model_version AS "modelVersion",
          predicted_at AS "predictedAt"
        FROM predictions
        WHERE student_id = $1
        ORDER BY predicted_at DESC
        LIMIT $2
      `,
      values: [studentId, safeLimit]
    };

    const { rows } = await pool.query(query);
    return rows as StoredPrediction[];
  }

  /**
   * Retrieve the latest prediction for a student.
   * Returns null if the student has no predictions.
   */
  async findLatestByStudentId(studentId: number): Promise<StoredPrediction | null> {
    const query = {
      text: `
        SELECT
          id,
          student_id AS "studentId",
          risk_probability AS "riskProbability",
          risk_level AS "riskLevel",
          model_version AS "modelVersion",
          predicted_at AS "predictedAt"
        FROM predictions
        WHERE student_id = $1
        ORDER BY predicted_at DESC
        LIMIT 1
      `,
      values: [studentId]
    };

    const { rows } = await pool.query(query);
    return (rows[0] as StoredPrediction) || null;
  }

  /**
   * Retrieve the most recent prediction for a student that is NOT the given
   * prediction id — i.e. the previous prediction before a just-stored one.
   * Used by the alert rules (Phase 9) to compare against the prior snapshot.
   */
  async findPreviousByStudentId(
    studentId: number,
    excludePredictionId: number
  ): Promise<StoredPrediction | null> {
    const query = {
      text: `
        SELECT
          id,
          student_id AS "studentId",
          risk_probability AS "riskProbability",
          risk_level AS "riskLevel",
          model_version AS "modelVersion",
          predicted_at AS "predictedAt"
        FROM predictions
        WHERE student_id = $1 AND id <> $2
        ORDER BY predicted_at DESC
        LIMIT 1
      `,
      values: [studentId, excludePredictionId]
    };

    const { rows } = await pool.query(query);
    return (rows[0] as StoredPrediction) || null;
  }
}

export default new PredictionRepository();