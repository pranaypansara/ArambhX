import StudentRepository from '../repositories/student.repository.js';
import AlertRepository from '../repositories/alert.repository.js';
import DashboardRepository from '../repositories/dashboard.repository.js';
import { StudentNotFoundError } from './prediction.service.js';
import { AlertPriority } from '../types/alert.types.js';
import {
  AttentionStudent,
  AttentionStudentsData,
  DashboardOverviewData,
  RecentIntervention,
  RiskBucket,
  StudentDashboardData,
  StudentPredictionTrend,
  StudentSafeDashboardData
} from '../types/dashboard.types.js';

/**
 * Dashboard aggregation service (Phase 11).
 *
 * Read-only aggregation over EXISTING stored data. Dashboards never:
 *   - trigger ML1 prediction or ML2 analysis,
 *   - recompute ML risk probabilities,
 *   - invent risk categories beyond the stored LOW/MEDIUM/HIGH vocabulary.
 *
 * The database is queried with efficient aggregate SQL (COUNT FILTER,
 * DISTINCT ON, LATERAL joins) so no application-level N+1 loops occur.
 */

/** Default size of per-student "latest interventions" list on the student dashboard. */
const STUDENT_LATEST_INTERVENTIONS_LIMIT = 5;

const VALID_RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH']);

const SEVERITY_LEVELS: Record<AlertPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

/** Map the numeric severity computed in SQL back to the alert priority string. */
const severityLevelToPriority = (level: number | null): AlertPriority | null => {
  if (level === null || level === undefined) return null;
  const entry = Object.entries(SEVERITY_LEVELS).find(([, rank]) => rank === level);
  return entry ? (entry[0] as AlertPriority) : null;
};

/** Only keep risk buckets whose risk_level exists in the stored ML1 vocabulary. */
const sanitizeRiskDistribution = (buckets: RiskBucket[]): RiskBucket[] =>
  buckets.filter((bucket) => VALID_RISK_LEVELS.has(bucket.riskLevel));

/** Fetch the ADMIN/global overview dashboard data. */
export const getDashboardOverview = async (recentLimit: number): Promise<DashboardOverviewData> => {
  const totalStudents = await StudentRepository.countAll();
  const studentsWithPredictions = await DashboardRepository.countStudentsWithPredictions();
  const riskDistribution = sanitizeRiskDistribution(await DashboardRepository.getRiskDistribution());
  const alerts = await DashboardRepository.getAlertOverviewStats();
  const interventions = await DashboardRepository.getInterventionOverviewStats();

  const recentLimitSafe = Math.min(Math.max(1, recentLimit), 50);
  const [recentPredictions, recentAlerts, recentInterventions] = await Promise.all([
    DashboardRepository.getRecentPredictions(recentLimitSafe),
    DashboardRepository.getRecentAlerts(recentLimitSafe),
    DashboardRepository.getRecentInterventions(recentLimitSafe)
  ]);

  return {
    students: {
      total: totalStudents,
      withPredictions: studentsWithPredictions,
      withoutPredictions: Math.max(0, totalStudents - studentsWithPredictions)
    },
    riskDistribution,
    alerts,
    interventions,
    recentActivity: {
      predictions: recentPredictions,
      alerts: recentAlerts,
      interventions: recentInterventions
    }
  };
};

/** Fetch the list of students currently requiring attention. */
export const getAttentionStudents = async (limit: number): Promise<AttentionStudentsData> => {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const rows = await DashboardRepository.getAttentionStudents(safeLimit);

  const attentionStudents: AttentionStudent[] = rows.map((row) => ({
    ...row,
    latestRiskLevel: VALID_RISK_LEVELS.has(row.latestRiskLevel ?? '')
      ? (row.latestRiskLevel as AttentionStudent['latestRiskLevel'])
      : null,
    highestAlertSeverity: severityLevelToPriority(row.highestAlertSeverity as number | null)
  }));

  return { attentionStudents };
};

/** Fetch aggregated dashboard data for a single student. */
export const getStudentDashboard = async (studentId: number): Promise<StudentDashboardData> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }

  const [predictionTrend, activeAlerts, interventionSummary, latestInterventions] =
    await Promise.all([
      DashboardRepository.getStudentPredictionTrend(studentId),
      AlertRepository.findOpenByStudentId(studentId),
      DashboardRepository.getStudentInterventionSummary(studentId),
      DashboardRepository.getRecentInterventionsForStudent(
        studentId,
        STUDENT_LATEST_INTERVENTIONS_LIMIT
      )
    ]);

  const trend: StudentPredictionTrend = {
    totalPredictions: predictionTrend.totalPredictions,
    latestRiskProbability: predictionTrend.latestRiskProbability,
    latestRiskLevel: VALID_RISK_LEVELS.has(predictionTrend.latestRiskLevel ?? '')
      ? (predictionTrend.latestRiskLevel as StudentPredictionTrend['latestRiskLevel'])
      : null,
    latestPredictedAt: predictionTrend.latestPredictedAt
  };

  return {
    student: {
      id: student.id,
      name: student.name,
      enrollmentNumber: student.enrollmentNumber,
      department: student.department,
      semester: student.semester
    },
    predictions: trend,
    alerts: {
      active: activeAlerts
    },
    interventions: interventionSummary,
    latestInterventions: latestInterventions as RecentIntervention[]
  };
};

/**
 * Phase 13: STUDENT-facing dashboard. Same underlying stored data, but shaped
 * so students never receive raw ML probabilities, internal risk labels/scores,
 * alert severity/messages, or audit details — only their profile, an active
 * alert count, and their actionable support plan.
 */
export const getStudentSafeDashboard = async (
  studentId: number
): Promise<StudentSafeDashboardData> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }

  const [activeAlerts, interventionSummary, latestInterventions] = await Promise.all([
    AlertRepository.findOpenByStudentId(studentId),
    DashboardRepository.getStudentInterventionSummary(studentId),
    DashboardRepository.getRecentInterventionsForStudent(
      studentId,
      STUDENT_LATEST_INTERVENTIONS_LIMIT
    )
  ]);

  return {
    student: {
      id: student.id,
      name: student.name,
      enrollmentNumber: student.enrollmentNumber,
      department: student.department,
      semester: student.semester
    },
    alerts: {
      activeCount: activeAlerts.length
    },
    interventions: interventionSummary,
    latestInterventions: (latestInterventions as RecentIntervention[]).map((intervention) => ({
      id: intervention.id,
      type: intervention.type,
      status: intervention.status,
      createdAt: intervention.createdAt
    }))
  };
};