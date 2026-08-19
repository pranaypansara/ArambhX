import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './src/config/db.js';
import { getJwtSecret } from './src/config/auth.js';

/**
 * Phase 14 - Full backend integration & security test suite.
 *
 * Runs against the RUNNING backend (default http://localhost:5000/api) and uses
 * the live Neon database. The ML service is assumed to be running (default
 * http://localhost:8000 via ML_SERVICE_URL).
 *
 * Notes:
 *  - A test ADMIN account is bootstrapped directly in the DB (bcrypt) because
 *    public registration deliberately cannot mint privileged roles.
 *  - All test identities use the clearly-marked `@test.local` domain and fixed
 *    emails so reruns are idempotent.
 *  - One dedicated "FLOW" student is created and DELETED within the suite so
 *    alert/intervention assertions are deterministic.
 *  - No production-like data is dropped or modified.
 *
 * Run: npm test   (tsx test-api.ts)
 */

const API = process.env.TEST_API_URL || 'http://localhost:5000/api';
const PASSWORD = 'Phase14!Test';

const ADMIN_EMAIL = 'p14.admin@test.local';
const FACULTY_EMAIL = 'p14.faculty@test.local';
const COUNSELOR_EMAIL = 'p14.counselor@test.local';
// Emails are stored lower-cased by the backend, so test identities must be
// lower-case too or `ensureUser` re-attempts creation on every rerun.
const STD_A_EMAIL = 'p14.studenta@test.local';
const STD_B_EMAIL = 'p14.studentb@test.local';

const STD_A_ENROLL = 'SIH-P14-STD-A';
const STD_B_ENROLL = 'SIH-P14-STD-B';

let regLinkStudentId: number | null = null;
let failures = 0;
let checksRun = 0;

function ok(name: string, cond: boolean, extra?: any): void {
  checksRun++;
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name}${extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function api(
  method: string,
  path: string,
  { token, body }: { token?: string; body?: any } = {}
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

async function ensureAdminUser(): Promise<void> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1;', [ADMIN_EMAIL]);
  if (existing.rows.length > 0) return;
  const hash = bcrypt.hashSync(PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4);`,
    ['Phase 14 Test Admin', ADMIN_EMAIL, hash, 'ADMIN']
  );
}

async function login(email: string): Promise<string> {
  const { status, body } = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
  assert.equal(status, 200, `login(${email}) should succeed`);
  assert.ok(body.token, 'login should return a token');
  return body.token as string;
}

async function findStudentByEnrollment(enrollment: string): Promise<number | null> {
  const r = await pool.query('SELECT id FROM students WHERE enrollment_number = $1;', [enrollment]);
  return r.rows.length ? (r.rows[0].id as number) : null;
}

async function findDemoStudent(label: string): Promise<number> {
  const id = await findStudentByEnrollment(`SIH-ML-DEMO-${label}`);
  assert.ok(id != null, `demo student ${label} must exist (run npm run seed:ml first)`);
  return id!;
}

async function countActiveHighRiskAlerts(studentId: number, token: string): Promise<number> {
  const { status, body } = await api('GET', `/students/${studentId}/alerts?limit=100`, { token });
  if (status !== 200 || !body?.data?.alerts) return 0;
  return body.data.alerts.filter(
    (a: any) => a.alertType === 'HIGH_RISK' && a.status === 'ACTIVE'
  ).length;
}

/** Create a reusable target (throws if already created elsewhere in the repo). */
async function createOrGetStudent(token: string, enrollment: string, name: string): Promise<number> {
  const existing = await findStudentByEnrollment(enrollment);
  if (existing != null) return existing;
  const { status, body } = await api('POST', `/students`, {
    token,
    body: {
      enrollmentNumber: enrollment,
      name,
      email: null,
      department: 'Integration Testing',
      semester: 4
    }
  });
  assert.equal(status, 201, `POST /students ${enrollment} should succeed: ${JSON.stringify(body)}`);
  return body.data.id as number;
}

async function main(): Promise<void> {
  console.log(`🚀 Phase 14 backend integration suite (API=${API})\n`);

  await ensureAdminUser();
  const adminToken = await login(ADMIN_EMAIL);
  const demoLow = await findDemoStudent('LOW');
  const demoEdge = await findDemoStudent('EDGE');
  const demoModerate = await findDemoStudent('MODERATE');
  const demoHigh = await findDemoStudent('HIGH');

  // ---------------------------------------------------------------------
  section('1. Backend & ML health');
  const h = await api('GET', '/health');
  ok('GET /health -> 200', h.status === 200 && h.body.success === true);
  const mh = await api('GET', '/ml/health');
  ok(
    'GET /ml/health proxies ML service (model_loaded + ml2_loaded)',
    mh.status === 200 && mh.body?.data?.model_loaded === true && mh.body?.data?.ml2_loaded === true
  );

  // ---------------------------------------------------------------------
  section('2. Authentication (register / login / me)');
  const regSuffix = `p14.${Date.now()}`;
  const regMissing = await api('POST', '/auth/register', { body: { email: 'x@test.local', password: 'bad' } });
  ok('register without name -> 400', regMissing.status === 400);

  const regInvalidEmail = await api('POST', '/auth/register', {
    body: { name: 'X', email: 'not-an-email', password: '123456' }
  });
  ok('register with invalid email -> 400', regInvalidEmail.status === 400);

  const regPublic = await api('POST', '/auth/register', {
    body: { name: 'Public Faculty', email: `${regSuffix}.faculty@test.local`, password: PASSWORD }
  });
  ok('public register (no role override) -> 201 STUDENT-less FACULTY', regPublic.status === 201 &&
    regPublic.body?.data?.role === 'FACULTY');

  // Public registration cannot mint ADMIN/COUNSELOR even if role is smuggled in.
  const regRoleSmuggle = await api('POST', '/auth/register', {
    body: { name: 'Smuggler', email: `${regSuffix}.smuggle@test.local`, password: PASSWORD, role: 'ADMIN' }
  });
  ok(
    'public register ignores client-provided ADMIN role',
    regRoleSmuggle.status === 201 && regRoleSmuggle.body?.data?.role === 'FACULTY'
  );

  const regDup = await api('POST', '/auth/register', {
    body: { name: 'Public Faculty', email: `${regSuffix}.faculty@test.local`, password: PASSWORD }
  });
  ok('duplicate registration -> 400', regDup.status === 400 && regDup.body?.success === false);

  // A student may only ever be linked to one user, so use a dedicated
  // throw-away student (deleted in cleanup) instead of a persistent demo row.
  // This keeps reruns idempotent.
  const linkTarget = await api('POST', '/students', {
    token: adminToken,
    body: {
      enrollmentNumber: `SIH-P14-LINK-${Date.now()}`,
      name: 'Link Target',
      email: null,
      department: 'IT',
      semester: 2
    }
  });
  assert.equal(linkTarget.status, 201, `create link-target student: ${JSON.stringify(linkTarget.body)}`);
  regLinkStudentId = linkTarget.body.data.id as number;
  const regLinkedStudent = await api('POST', '/auth/register', {
    body: {
      name: 'Linked Student',
      email: `${regSuffix}.student@test.local`,
      password: PASSWORD,
      studentId: regLinkStudentId
    }
  });
  ok('register with valid studentId -> 201 STUDENT', regLinkedStudent.status === 201 &&
    regLinkedStudent.body?.data?.role === 'STUDENT' && regLinkedStudent.body?.data?.studentId === regLinkStudentId);

  const regBadStudent = await api('POST', '/auth/register', {
    body: {
      name: 'Bad Link',
      email: `${regSuffix}.badstudent@test.local`,
      password: PASSWORD,
      studentId: 99999999
    }
  });
  ok('register with non-existent studentId -> 400', regBadStudent.status === 400);

  const loginBad = await api('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: 'wrong-pass' } });
  ok('login wrong password -> 401', loginBad.status === 401 && loginBad.body?.success === false);

  const loginUnknown = await api('POST', '/auth/login', { body: { email: 'nobody@test.local', password: PASSWORD } });
  ok('login unknown user -> 401 (generic)', loginUnknown.status === 401);

  const loginMissing = await api('POST', '/auth/login', { body: { email: 'a@b.com' } });
  ok('login missing password -> 400', loginMissing.status === 400);

  const meNoToken = await api('GET', '/auth/me');
  ok('GET /auth/me without token -> 401', meNoToken.status === 401);
  const meBadToken = await api('GET', '/auth/me', { token: 'garbage.token.value' });
  ok('GET /auth/me with invalid token -> 401', meBadToken.status === 401);
  const expired = jwt.sign({ id: 999 }, getJwtSecret(), { expiresIn: '-10s' });
  const meExpired = await api('GET', '/auth/me', { token: expired });
  ok('GET /auth/me with expired token -> 401', meExpired.status === 401);

  const meAdmin = await api('GET', '/auth/me', { token: adminToken });
  ok('GET /auth/me with valid token -> 200 + ADMIN', meAdmin.status === 200 && meAdmin.body?.data?.role === 'ADMIN');
  ok('me payload does NOT contain password', !('password' in (meAdmin.body?.data ?? {})));

  // ---------------------------------------------------------------------
  section('3. Admin user creation (RBAC bootstrap)');
  const ensureUser = async (email: string, role: string, opts: any = {}) => {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1;', [email]);
    if (existing.rows.length > 0) return;
    const { status, body } = await api('POST', '/auth/admin/create-user', {
      token: adminToken,
      body: { name: 'Phase 14 ' + role, email, password: PASSWORD, role, ...opts }
    });
    assert.equal(status, 201, `create-user ${email} -> ${status} ${JSON.stringify(body)}`);
    if (role === 'STUDENT' && opts.studentId) {
      // link stored on the user row
    }
  };

  const stdA = await createOrGetStudent(adminToken, STD_A_ENROLL, 'P14 Student A');
  const stdB = await createOrGetStudent(adminToken, STD_B_ENROLL, 'P14 Student B');
  await ensureUser(FACULTY_EMAIL, 'FACULTY');
  await ensureUser(COUNSELOR_EMAIL, 'COUNSELOR');
  await ensureUser(STD_A_EMAIL, 'STUDENT', { studentId: stdA });
  await ensureUser(STD_B_EMAIL, 'STUDENT', { studentId: stdB });

  const cuNoLink = await api('POST', '/auth/admin/create-user', {
    token: adminToken,
    body: { name: 'No Link', email: `${regSuffix}.nolink@test.local`, password: PASSWORD, role: 'STUDENT' }
  });
  ok('create STUDENT user without studentId -> 400', cuNoLink.status === 400);

  const cuBadRole = await api('POST', '/auth/admin/create-user', {
    token: adminToken,
    body: { name: 'Bad Role', email: `${regSuffix}.badrole@test.local`, password: PASSWORD, role: 'SUPERUSER' }
  });
  ok('create-user with invalid role -> 400', cuBadRole.status === 400);

  const cuForbiddenRole = await api('POST', '/auth/admin/create-user', {
    token: adminToken,
    body: { name: 'F', email: `${regSuffix}.forbidden@test.local`, password: PASSWORD, role: 'ADMIN' }
  });
  ok('create-user (ADMIN) by ADMIN -> 201', cuForbiddenRole.status === 201);

  const facultyToken = await login(FACULTY_EMAIL);
  const counselorToken = await login(COUNSELOR_EMAIL);
  const stdAToken = await login(STD_A_EMAIL);
  const stdBToken = await login(STD_B_EMAIL);

  // ---------------------------------------------------------------------
  section('4. Student CRUD');
  // Reuse demo students as read-only fixtures; create a throw-away for CRUD edge cases.
  const crudEnroll = `SIH-P14-CRUD-${Date.now()}`;
  const crud = await api('POST', '/students', {
    token: adminToken,
    body: { enrollmentNumber: crudEnroll, name: 'CRUD Test', email: null, department: 'CSE', semester: 3 }
  });
  ok('POST /students (ADMIN) -> 201', crud.status === 201 && crud.body?.data?.id != null);
  const crudId: number = crud.body.data.id;

  const crudDup = await api('POST', '/students', {
    token: adminToken,
    body: { enrollmentNumber: crudEnroll, name: 'Dup', email: null, department: 'CSE', semester: 3 }
  });
  ok('duplicate enrollment -> 400', crudDup.status === 400);

  const crudBad = await api('POST', '/students', {
    token: adminToken,
    body: { enrollmentNumber: `X-${Date.now()}`, name: 'Bad', email: 'nope', semester: 0 }
  });
  ok('invalid student payload -> 400', crudBad.status === 400);

  const crudList = await api('GET', '/students?limit=100', { token: adminToken });
  ok('GET /students (ADMIN) -> 200 + pagination', crudList.status === 200 && crudList.body?.pagination?.totalStudents >= 6);

  const crudGet = await api('GET', `/students/${crudId}`, { token: adminToken });
  ok('GET /students/:id -> 200', crudGet.status === 200 && crudGet.body?.data?.id === crudId);

  const crudPatch = await api('PATCH', `/students/${crudId}`, {
    token: adminToken,
    body: { semester: 5 }
  });
  ok('PATCH /students/:id -> 200 + updated', crudPatch.status === 200 && crudPatch.body?.data?.semester === 5);

  const crudDel = await api('DELETE', `/students/${crudId}`, { token: adminToken });
  ok('DELETE /students/:id (ADMIN) -> 200', crudDel.status === 200);
  const crudGone = await api('GET', `/students/${crudId}`, { token: adminToken });
  ok('deleted student lookup -> 404', crudGone.status === 404);

  // ---------------------------------------------------------------------
  section('5. Attendance & academic records');
  const att = await api('POST', `/students/${demoHigh}/attendance`, {
    token: facultyToken,
    body: { attendancePercentage: 45, recordedAt: '2099-01-01T00:00:00.000Z' }
  });
  ok('POST attendance -> 201', att.status === 201);

  const attBad = await api('POST', `/students/${demoHigh}/attendance`, {
    token: facultyToken,
    body: { attendancePercentage: 150 }
  });
  ok('attendance out of range -> 400', attBad.status === 400);

  const acad = await api('POST', `/students/${demoHigh}/academic-records`, {
    token: facultyToken,
    body: { averageMarks: 38, backlogCount: 3, assignmentCompletion: 55, lmsActivity: 40, recordedAt: '2099-01-01T00:00:00.000Z' }
  });
  ok('POST academic-record -> 201', acad.status === 201);

  const acadBad = await api('POST', `/students/${demoHigh}/academic-records`, {
    token: facultyToken,
    body: { backlogCount: -1 }
  });
  ok('academic record with negative backlog -> 400', acadBad.status === 400);

  const summ = await api('GET', `/students/${demoHigh}/summary`, { token: facultyToken });
  ok(
    'GET summary -> latest attendance + academic',
    summ.status === 200 &&
      parseFloat(String(summ.body?.data?.latestAttendance?.attendancePercentage)) === 45 &&
      parseFloat(String(summ.body?.data?.latestAcademicRecord?.averageMarks)) === 38 &&
      summ.body?.data?.latestAcademicRecord?.backlogCount === 3
  );

  const attHist = await api('GET', `/students/${demoHigh}/attendance`, { token: facultyToken });
  ok('GET attendance history -> 200 array', attHist.status === 200 && Array.isArray(attHist.body?.data?.attendance));

  // ---------------------------------------------------------------------
  section('6. ML feature builder');
  for (const [label, id] of [['LOW', demoLow], ['EDGE', demoEdge], ['MODERATE', demoModerate]] as const) {
    const f = await api('GET', `/students/${id}/ml-features`, { token: facultyToken });
    const feats = f.body?.data?.features;
    ok(`ml-features ${label} -> 200 (${Object.keys(feats ?? {}).length} features)`, f.status === 200 && !!feats);
  }
  const featNone = await api('GET', '/students/99999999/ml-features', { token: facultyToken });
  ok('ml-features unknown student -> 404', featNone.status === 404);

  // ---------------------------------------------------------------------
  section('7. ML1 predict + storage + history');
  // Dedicated FLOW student for deterministic assertions (deleted at the end).
  const flowEnroll = `SIH-P14-FLOW-${Date.now()}`;
  const flow = await api('POST', '/students', {
    token: adminToken,
    body: { enrollmentNumber: flowEnroll, name: 'P14 Flow Test', email: null, department: 'IT', semester: 2 }
  });
  const flowId: number = flow.body.data.id;
  const pred = await api('POST', `/students/${flowId}/predict`, { token: facultyToken });
  const pd = pred.body?.data;
  ok('POST /predict -> 200 + stored metadata', pred.status === 200 &&
    pd?.predictionId != null && typeof pd?.risk_probability === 'number' &&
    ['LOW', 'MEDIUM', 'HIGH'].includes(pd?.risk_level) && pd?.createdAt != null);
  const storedProb: number = pd?.risk_probability;

  // The predictions table stores risk_probability as numeric(5,4), so the
  // persisted value is rounded to 4 decimals. Both endpoints must agree exactly
  // with that stored value.
  const stored4 = Math.round(storedProb * 10000) / 10000;
  const latest = await api('GET', `/students/${flowId}/predictions/latest`, { token: facultyToken });
  ok('latest prediction matches stored value', latest.status === 200 &&
    typeof latest.body?.data?.riskProbability === 'number' &&
    latest.body?.data?.riskProbability === stored4 && latest.body?.data?.studentId === flowId);

  const hist = await api('GET', `/students/${flowId}/predictions`, { token: facultyToken });
  ok('prediction history contains the stored one', hist.status === 200 &&
    Array.isArray(hist.body?.data?.predictions) && (hist.body?.data?.predictions?.length ?? 0) >= 1);

  // Persisted values must match the ML response exactly (contract).
  const row = await pool.query('SELECT risk_probability::float8 AS prob, risk_level, model_version FROM predictions WHERE id = $1;', [pd.predictionId]);
  ok('stored DB risk_probability === ML response (numeric(5,4) precision)', row.rows[0].prob === stored4);

  const predNone = await api('POST', '/students/99999999/predict', { token: facultyToken });
  ok('predict unknown student -> 404', predNone.status === 404);

  const latestNone = await api('GET', '/students/99999999/predictions/latest', { token: facultyToken });
  ok('latest prediction unknown student -> 404', latestNone.status === 404);

  // ---------------------------------------------------------------------
  section('8. ML2 risk intelligence');
  const ml2 = await api('POST', `/students/${demoEdge}/risk-analysis`, { token: counselorToken });
  const m2 = ml2.body?.data;
  ok('POST /risk-analysis (EDGE) -> 200 + full schema', ml2.status === 200 &&
    m2?.student_id === demoEdge && typeof m2?.risk_probability === 'number' &&
    ['LOW', 'MEDIUM', 'HIGH'].includes(m2?.risk_category) && m2?.risk_trend?.num_snapshots != null &&
    m2?.alert?.alert_level != null && Array.isArray(m2?.recommendations) && Array.isArray(m2?.risk_history));

  const ml2Maybe = await api('POST', `/students/${demoLow}/risk-analysis`, { token: counselorToken });
  ok('POST /risk-analysis (LOW) -> 200', ml2Maybe.status === 200);

  const ml2None = await api('POST', '/students/99999999/risk-analysis', { token: counselorToken });
  ok('risk-analysis unknown student -> 404', ml2None.status === 404);

  // ML1 and ML2 outputs remain separated (stored predictions untouched by risk-analysis).
  const beforeCounts = await pool.query('SELECT COUNT(*)::int AS c FROM predictions;');
  await api('POST', `/students/${demoLow}/risk-analysis`, { token: counselorToken });
  const afterCounts = await pool.query('SELECT COUNT(*)::int AS c FROM predictions;');
  ok('ML2 does NOT write to predictions table', afterCounts.rows[0].c === beforeCounts.rows[0].c);

  // ---------------------------------------------------------------------
  section('9. Alerts');
  // Deterministic rule A: demo EDGE is HIGH -> predict then ML2 must yield an
  // ACTIVE HIGH_RISK alert (dedup keeps a repeat call from duplicating).
  const beforeHigh = await countActiveHighRiskAlerts(demoEdge, facultyToken);
  await api('POST', `/students/${demoEdge}/risk-analysis`, { token: facultyToken });
  const afterHigh = await countActiveHighRiskAlerts(demoEdge, facultyToken);
  ok('HIGH risk reaches an ACTIVE HIGH_RISK alert', afterHigh >= 1 && afterHigh >= beforeHigh);

  const alertsList = await api('GET', '/alerts', { token: facultyToken });
  ok('GET /alerts -> 200 with pagination', alertsList.status === 200 && alertsList.body?.pagination?.totalAlerts >= 1);

  const oneAlert = alertsList.body?.data?.alerts?.[0];
  const alertGet = await api('GET', `/alerts/${oneAlert?.id}`, { token: facultyToken });
  ok('GET /alerts/:id -> 200 matches', alertGet.status === 200 && alertGet.body?.data?.id === oneAlert?.id);

  const alertBad = await api('GET', '/alerts/99999999', { token: facultyToken });
  ok('GET /alerts/:id missing -> 404', alertBad.status === 404);

  const alertResolve = await api('PATCH', `/alerts/${oneAlert?.id}/resolve`, { token: facultyToken });
  ok('PATCH /alerts/:id/resolve -> RESOLVED', alertResolve.status === 200 && alertResolve.body?.data?.status === 'RESOLVED');

  const alertFiltBad = await api('GET', '/alerts?status=BOGUS', { token: facultyToken });
  ok('alert status filter invalid -> 400', alertFiltBad.status === 400);

  const idBad = await api('GET', '/alerts/abc', { token: facultyToken });
  ok('alert id invalid format -> 400', idBad.status === 400);

  // ---------------------------------------------------------------------
  section('10. Interventions');
  const gen = await api('POST', `/students/${demoHigh}/interventions/generate`, { token: facultyToken });
  const createdTypes = (gen.body?.data?.created ?? []).map((i: any) => i.type);
  const openTypes = (gen.body?.data?.openInterventions ?? []).map((i: any) => i.type);
  ok('generate -> 200', gen.status === 200);
  // demoHigh got attendance 45 + academics 38/3 => deterministic data rules.
  ok('ATTENDANCE_PLAN recommended', openTypes.includes('ATTENDANCE_PLAN'));
  ok('ACADEMIC_TUTORING recommended', openTypes.includes('ACADEMIC_TUTORING'));

  const gen2 = await api('POST', `/students/${demoHigh}/interventions/generate`, { token: facultyToken });
  ok('redundant generate does NOT duplicate (dedup)', (gen2.body?.data?.created ?? []).length === 0);

  const intList = await api('GET', `/students/${demoHigh}/interventions`, { token: facultyToken });
  const intId = intList.body?.data?.interventions?.[0]?.id;
  ok('GET /students/:id/interventions -> 200', intList.status === 200 && intId != null);

  const intGet = await api('GET', `/interventions/${intId}`, { token: facultyToken });
  ok('GET /interventions/:id -> 200', intGet.status === 200 && intGet.body?.data?.id === intId);

  // Status lifecycle: RECOMMENDED -> ASSIGNED -> IN_PROGRESS -> EVALUATED -> CLOSED.
  const s1 = await api('PATCH', `/interventions/${intId}/status`, { token: facultyToken, body: { status: 'ASSIGNED' } });
  ok('transition RECOMMENDED->ASSIGNED -> 200', s1.status === 200 && s1.body?.data?.status === 'ASSIGNED');
  const s2 = await api('PATCH', `/interventions/${intId}/status`, { token: facultyToken, body: { status: 'IN_PROGRESS' } });
  ok('transition ASSIGNED->IN_PROGRESS -> 200', s2.status === 200);
  const s3 = await api('PATCH', `/interventions/${intId}/status`, { token: facultyToken, body: { status: 'EVALUATED' } });
  ok('transition IN_PROGRESS->EVALUATED -> 200', s3.status === 200);
  const s4 = await api('PATCH', `/interventions/${intId}/status`, { token: facultyToken, body: { status: 'CLOSED' } });
  ok('transition EVALUATED->CLOSED -> 200', s4.status === 200);
  const sBadTransition = await api('PATCH', `/interventions/${intId}/status`, { token: facultyToken, body: { status: 'ASSIGNED' } });
  ok('CLOSED->ASSIGNED (invalid transition) -> 400', sBadTransition.status === 400);
  const sBadValue = await api('PATCH', `/interventions/${intId}/status`, { token: facultyToken, body: { status: 'BOGUS' } });
  ok('invalid status value -> 400', sBadValue.status === 400);
  const sNoBody = await api('PATCH', `/interventions/${intId}/status`, { token: facultyToken, body: {} });
  ok('missing status body -> 400', sNoBody.status === 400);

  const intNone = await api('GET', '/interventions/99999999', { token: facultyToken });
  ok('GET /interventions/:id missing -> 404', intNone.status === 404);

  // ---------------------------------------------------------------------
  section('11. Notifications');
  const notifList = await api('GET', '/notifications', { token: facultyToken });
  const facultyNotifs = notifList.body?.data?.notifications ?? [];
  ok('faculty sees notifications from their actions', notifList.status === 200 && facultyNotifs.length >= 1);
  const someNotif = facultyNotifs[0];

  const unreadBefore = await api('GET', '/notifications/unread-count', { token: facultyToken });
  ok('unread-count -> 200 number', unreadBefore.status === 200 && typeof unreadBefore.body?.data?.unreadCount === 'number');

  const dedupedTypes = facultyNotifs.map((n: any) => `${n.type}:${n.relatedEntityType}:${n.relatedEntityId}`);
  ok(
    'identical notification (same type+entity) not duplicated for one event',
    new Set(dedupedTypes).size === dedupedTypes.length
  );

  const markOne = await api('PATCH', `/notifications/${someNotif.id}/read`, { token: facultyToken });
  ok('PATCH /notifications/:id/read -> isRead true', markOne.status === 200 && markOne.body?.data?.isRead === true);

  const markAll = await api('PATCH', '/notifications/read-all', { token: facultyToken });
  ok('PATCH /notifications/read-all -> 200', markAll.status === 200);
  const unreadAfter = await api('GET', '/notifications/unread-count', { token: facultyToken });
  ok('unread-count after read-all = 0', unreadAfter.body?.data?.unreadCount === 0);

  const notifReadFilter = await api('GET', '/notifications?read=true', { token: facultyToken });
  ok('GET /notifications?read=true filters', notifReadFilter.status === 200 &&
    (notifReadFilter.body?.data?.notifications ?? []).every((n: any) => n.isRead === true));

  // Cross-user: student A must NOT read/mark/see faculty notifications.
  const crossRead = await api('PATCH', `/notifications/${someNotif.id}/read`, { token: stdAToken });
  ok('student cannot mark another user notification read (404)', crossRead.status === 404);
  const stdANotifs = await api('GET', '/notifications', { token: stdAToken });
  ok(
    'student sees only own notifications (does not leak others)',
    stdANotifs.status === 200 &&
      (stdANotifs.body?.data?.notifications ?? []).every((n: any) => n.id !== someNotif.id)
  );

  const notifBad = await api('GET', '/notifications/99999999', { token: facultyToken });
  ok('GET /notifications/:id missing -> 404', notifBad.status === 404);

  // ---------------------------------------------------------------------
  section('12. Audit logs');
  const audit = await api('GET', '/audit-logs?limit=50', { token: adminToken });
  const logs = audit.body?.data?.auditLogs ?? [];
  ok('GET /audit-logs (ADMIN) -> 200', audit.status === 200 && logs.length >= 1);

  const actions = new Set(logs.map((l: any) => l.action));
  for (const act of ['PREDICTION_CREATED', 'ALERT_CREATED', 'ALERT_RESOLVED', 'INTERVENTION_CREATED', 'INTERVENTION_STATUS_UPDATED', 'NOTIFICATION_CREATED', 'NOTIFICATION_READ']) {
    ok(`audit contains ${act}`, actions.has(act));
  }

  const actFilt = await api('GET', '/audit-logs?action=PREDICTION_CREATED', { token: adminToken });
  ok('audit action filter works', actFilt.status === 200 &&
    (actFilt.body?.data?.auditLogs ?? []).every((l: any) => l.action === 'PREDICTION_CREATED'));

  const secretsScan = JSON.stringify(logs);
  ok(
    'audit details never include secrets (password/hash/token)',
    !/password|bcrypt|jwt|Bearer|secret/i.test(secretsScan)
  );

  // ---------------------------------------------------------------------
  section('13. Dashboards');
  const ov = await api('GET', '/dashboard/overview', { token: adminToken });
  const dbTotal = (await pool.query('SELECT COUNT(*)::int AS c FROM students;')).rows[0].c;
  ok('overview students.total matches DB', ov.status === 200 && ov.body?.data?.students?.total === dbTotal);
  const buckets = ov.body?.data?.riskDistribution ?? [];
  ok('risk distribution buckets are valid vocabulary', buckets.every((b: any) => ['LOW', 'MEDIUM', 'HIGH'].includes(b.riskLevel)));
  ok('risk distribution sums to students-with-predictions', buckets.reduce((s: number, b: any) => s + b.count, 0) === ov.body?.data?.students?.withPredictions);
  ok('recentActivity arrays present', Array.isArray(ov.body?.data?.recentActivity?.predictions) &&
    Array.isArray(ov.body?.data?.recentActivity?.alerts) &&
    Array.isArray(ov.body?.data?.recentActivity?.interventions));

  const attn = await api('GET', '/dashboard/attention-students', { token: facultyToken });
  ok('attention-students -> 200', attn.status === 200 && Array.isArray(attn.body?.data?.attentionStudents));

  const staffDash = await api('GET', `/students/${demoEdge}/dashboard`, { token: facultyToken });
  ok('staff student dashboard -> 200 with predictions', staffDash.status === 200 &&
    staffDash.body?.data?.predictions?.latestRiskLevel === 'HIGH');

  const stdADashOwn = await api('GET', `/students/${stdA}/dashboard`, { token: stdAToken });
  ok('student own safe dashboard -> 200', stdADashOwn.status === 200 && stdADashOwn.body?.data?.student?.id === stdA);
  const safeBody = JSON.stringify(stdADashOwn.body?.data);
  ok('student dashboard does NOT expose ML probability/severity', !/riskProbability|risk_level|alertType|priority|suitabilityScore/.test(safeBody));

  // ---------------------------------------------------------------------
  section('14. RBAC matrix');
  const adminOnly = (await api('GET', '/admin-only', { token: adminToken })).status;
  const adminOnlyFaculty = (await api('GET', '/admin-only', { token: facultyToken })).status;
  const adminOnlyCounselor = (await api('GET', '/admin-only', { token: counselorToken })).status;
  const adminOnlyStudent = (await api('GET', '/admin-only', { token: stdAToken })).status;
  ok('ADMIN -> /admin-only 200', adminOnly === 200);
  ok('FACULTY -> /admin-only 403', adminOnlyFaculty === 403);
  ok('COUNSELOR -> /admin-only 403', adminOnlyCounselor === 403);
  ok('STUDENT -> /admin-only 403', adminOnlyStudent === 403);

  const staffOnlyFaculty = (await api('GET', '/staff-only', { token: facultyToken })).status;
  const staffOnlyCounselor = (await api('GET', '/staff-only', { token: counselorToken })).status;
  const staffOnlyStudent = (await api('GET', '/staff-only', { token: stdAToken })).status;
  ok('FACULTY -> /staff-only 200', staffOnlyFaculty === 200);
  ok('COUNSELOR -> /staff-only 200', staffOnlyCounselor === 200);
  ok('STUDENT -> /staff-only 403', staffOnlyStudent === 403);

  const studentsAsStudent = (await api('GET', '/students', { token: stdAToken })).status;
  ok('STUDENT cannot list all students -> 403', studentsAsStudent === 403);

  const studentsAsFaculty = (await api('GET', '/students', { token: facultyToken })).status;
  ok('FACULTY can list students -> 200', studentsAsFaculty === 200);

  const createStudentAsFaculty = (await api('POST', '/students', { token: facultyToken, body: { enrollmentNumber: `Y-${Date.now()}`, name: 'n', email: null, department: 'd', semester: 1 } })).status;
  ok('FACULTY cannot create students -> 403', createStudentAsFaculty === 403);

  const patchStudentAsFaculty = (await api('PATCH', `/students/${demoLow}`, { token: facultyToken, body: { semester: 1 } })).status;
  ok('FACULTY cannot update students -> 403', patchStudentAsFaculty === 403);

  const deleteStudentAsFaculty = (await api('DELETE', `/students/${demoLow}`, { token: facultyToken })).status;
  ok('FACULTY cannot delete students -> 403', deleteStudentAsFaculty === 403);

  const stdPredict = (await api('POST', `/students/${demoLow}/predict`, { token: stdAToken })).status;
  ok('STUDENT cannot trigger ML predict -> 403', stdPredict === 403);
  const stdML2 = (await api('POST', `/students/${demoLow}/risk-analysis`, { token: stdAToken })).status;
  ok('STUDENT cannot trigger ML2 -> 403', stdML2 === 403);
  const stdMlFeat = (await api('GET', `/students/${demoLow}/ml-features`, { token: stdAToken })).status;
  ok('STUDENT cannot view ml-features -> 403', stdMlFeat === 403);
  const stdAlertsAll = (await api('GET', '/alerts', { token: stdAToken })).status;
  ok('STUDENT cannot list all alerts -> 403', stdAlertsAll === 403);
  const stdAttn = (await api('GET', '/dashboard/attention-students', { token: stdAToken })).status;
  ok('STUDENT cannot view attention dashboard -> 403', stdAttn === 403);
  const stdGenInt = (await api('POST', `/students/${demoLow}/interventions/generate`, { token: stdAToken })).status;
  ok('STUDENT cannot generate interventions -> 403', stdGenInt === 403);
  const auditAsFaculty = (await api('GET', '/audit-logs', { token: facultyToken })).status;
  ok('FACULTY cannot view audit logs -> 403', auditAsFaculty === 403);
  const auditAsStudent = (await api('GET', '/audit-logs', { token: stdAToken })).status;
  ok('STUDENT cannot view audit logs -> 403', auditAsStudent === 403);

  const adminCreateUserByFaculty = (await api('POST', '/auth/admin/create-user', { token: facultyToken, body: { name: 'x', email: `${regSuffix}.cu@test.local`, password: PASSWORD, role: 'FACULTY' } })).status;
  ok('FACULTY cannot call admin create-user -> 403', adminCreateUserByFaculty === 403);

  // ---------------------------------------------------------------------
  section('15. CRITICAL - Student ownership security (A vs B)');
  const B = [
    ['/summary', 'GET', undefined],
    ['/dashboard', 'GET', undefined],
    ['/interventions', 'GET', undefined],
    ['/attendance', 'GET', undefined],
    ['/academic-records', 'GET', undefined]
  ] as const;
  for (const [route, method] of B) {
    const res = await api(method, `/students/${stdB}${route}`, { token: stdAToken });
    ok(`Student A accessing Student B ${route} -> 403`, res.status === 403);
  }
  const ownB = await api('GET', `/students/${stdB}/dashboard`, { token: stdBToken });
  ok('Student B can access own dashboard -> 200', ownB.status === 200 && ownB.body?.data?.student?.id === stdB);
  const ownADash = await api('GET', `/students/${stdA}/dashboard`, { token: stdAToken });
  ok('Student A can access own dashboard -> 200', ownADash.status === 200 && ownADash.body?.data?.student?.id === stdA);
  const ownInt = await api('GET', `/students/${stdA}/interventions`, { token: stdAToken });
  ok('Student A can access own interventions -> 200', ownInt.status === 200);

  // Staff can access other students (legitimate) — ownership must not break staff.
  const staffAccess = await api('GET', `/students/${stdB}/summary`, { token: counselorToken });
  ok('COUNSELOR can access Student B summary -> 200', staffAccess.status === 200);

  // ---------------------------------------------------------------------
  section('16. Error & edge cases');
  const badId = await api('GET', '/students/abc', { token: adminToken });
  ok('non-numeric student id -> 400', badId.status === 400);
  const nonExist = await api('GET', '/students/99999999', { token: adminToken });
  ok('non-existent student -> 404', nonExist.status === 404);
  const noAuthStudentGet = await api('GET', `/students/${demoLow}`);
  ok('protected route without token -> 401', noAuthStudentGet.status === 401);
  const badFmtToken = await api('GET', `/students/${demoLow}`, { token: 'not-bearer' });
  ok('malformed Authorization header -> 401', badFmtToken.status === 401);
  const attMissing = await api('POST', `/students/${demoLow}/attendance`, { token: facultyToken, body: {} });
  ok('attendance missing body -> 400', attMissing.status === 400);
  const acadMissing = await api('POST', `/students/${demoLow}/academic-records`, { token: facultyToken, body: {} });
  ok('academic record missing body -> 400', acadMissing.status === 400);

  // ---------------------------------------------------------------------
  section('17. Cleanup');
  // Delete the throw-away FLOW student (cascades its predictions/alerts/interventions).
  const flowDel = await api('DELETE', `/students/${flowId}`, { token: adminToken });
  ok(`DELETE throw-away FLOW student (${flowEnroll})`, flowDel.status === 200);
  const flowGone = await api('GET', `/students/${flowId}`, { token: adminToken });
  ok('FLOW student removed', flowGone.status === 404);

  // Delete the section-2 registration link target (keeps reruns idempotent).
  if (regLinkStudentId != null) {
    const linkDel = await api('DELETE', `/students/${regLinkStudentId}`, { token: adminToken });
    ok(`DELETE throw-away LINK student (#${regLinkStudentId})`, linkDel.status === 200);
  }

  // ---------------------------------------------------------------------
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Phase 14 suite: ${checksRun} checks, ${failures} failure(s)`);
  console.log(`${'='.repeat(70)}`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (err) => {
  console.error('\n❌ SUITE ERROR:', err);
  process.exitCode = 1;
});
