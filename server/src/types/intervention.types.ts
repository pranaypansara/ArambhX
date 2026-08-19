/**
 * Intervention types mirroring the actual `interventions` table in Neon
 * PostgreSQL (schema inspected directly from the live database).
 *
 * The table already enforces the vocabulary below via CHECK constraints:
 *   type     IN ('MENTOR_MEETING','ACADEMIC_TUTORING','ATTENDANCE_PLAN',
 *                'COUNSELING','FINANCIAL_SUPPORT_REFERRAL')
 *   priority IN ('LOW','MEDIUM','HIGH','CRITICAL')
 *   status   IN ('RECOMMENDED','ASSIGNED','IN_PROGRESS','COMPLETED',
 *                'EVALUATED','CLOSED','ESCALATED')
 *
 * Only the interventions table is used by the recommendation system.
 * `intervention_outcomes` already exists in the schema for future outcome
 * tracking, but no outcome flow is introduced in this phase.
 */

export const INTERVENTION_TYPES = [
  'MENTOR_MEETING',
  'ACADEMIC_TUTORING',
  'ATTENDANCE_PLAN',
  'COUNSELING',
  'FINANCIAL_SUPPORT_REFERRAL'
] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const INTERVENTION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type InterventionPriority = (typeof INTERVENTION_PRIORITIES)[number];

export const INTERVENTION_STATUSES = [
  'RECOMMENDED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'EVALUATED',
  'CLOSED',
  'ESCALATED'
] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

/** Statuses that count as an OPEN intervention (used for de-duplication). */
export const OPEN_INTERVENTION_STATUSES: InterventionStatus[] = [
  'RECOMMENDED',
  'ASSIGNED',
  'IN_PROGRESS'
];

/**
 * Allowed lifecycle transitions between intervention statuses. The table
 * accepts any of the checked status values; this application-level map keeps
 * the workflow meaningful (e.g. an already-CLOSED intervention cannot be
 * silently reopened into RECOMMENDED).
 */
export const INTERVENTION_STATUS_TRANSITIONS: Record<
  InterventionStatus,
  InterventionStatus[]
> = {
  RECOMMENDED: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'CLOSED', 'ESCALATED'],
  ASSIGNED: ['IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'CLOSED', 'ESCALATED'],
  IN_PROGRESS: ['COMPLETED', 'EVALUATED', 'CLOSED', 'ESCALATED'],
  COMPLETED: ['EVALUATED', 'CLOSED'],
  EVALUATED: ['CLOSED'],
  CLOSED: [],
  ESCALATED: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'CLOSED']
};

/** Input used when the recommendation service decides an intervention to create. */
export interface CreateInterventionInput {
  studentId: number;
  type: InterventionType;
  reason: string;
  priority: InterventionPriority;
  notes?: string | null;
}

/** A row from the `interventions` table surfaced by the intervention repository. */
export interface StoredIntervention {
  id: number;
  studentId: number;
  studentName: string;
  type: InterventionType;
  reason: string;
  priority: InterventionPriority;
  status: InterventionStatus;
  assignedTo: number | null;
  deadline: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}