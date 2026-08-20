const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

let _token = null;
let _onUnauthorized = null;

export function setAuthToken(token) {
  _token = token || null;
}

export function setOnUnauthorized(handler) {
  _onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function buildQuery(params) {
  if (!params) return "";
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function request(method, path, { params, body } = {}) {
  const url = `${API_BASE_URL}${path}${buildQuery(params)}`;
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (_token) headers.Authorization = `Bearer ${_token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      "Unable to reach the server. Please check your connection and try again.",
      0,
      null,
    );
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch (err) {
    /* non-JSON response */
  }

  if (!res.ok) {
    if (res.status === 401 && _onUnauthorized) _onUnauthorized();
    throw new ApiError(
      payload?.message || `Request failed (${res.status})`,
      res.status,
      payload,
    );
  }

  return payload || { success: true };
}

const get = (path, params) => request("GET", path, { params });
const post = (path, body) => request("POST", path, { body });
const patch = (path, body) => request("PATCH", path, { body });

export const api = {
  // Health
  health: () => get("/health"),

  // Auth
  register: (body) => post("/auth/register", body),
  login: (body) => post("/auth/login", body),
  me: () => get("/auth/me"),
  adminCreateUser: (body) => post("/auth/admin/create-user", body),

  // Students
  listStudents: (params) => get("/students", params),
  getStudent: (id) => get(`/students/${id}`),
  createStudent: (body) => post("/students", body),
  updateStudent: (id, body) => patch(`/students/${id}`, body),
  deleteStudent: (id) => request("DELETE", `/students/${id}`),
  getStudentSummary: (id) => get(`/students/${id}/summary`),
  getStudentPredictions: (id, params) =>
    get(`/students/${id}/predictions`, params),
  getLatestPrediction: (id) => get(`/students/${id}/predictions/latest`),
  predictStudent: (id) => post(`/students/${id}/predict`),
  getMLFeatures: (id) => get(`/students/${id}/ml-features`),
  analyzeRisk: (id) => post(`/students/${id}/risk-analysis`),
  getStudentAlerts: (id, params) => get(`/students/${id}/alerts`, params),
  getStudentInterventions: (id, params) =>
    get(`/students/${id}/interventions`, params),
  generateInterventions: (id) => post(`/students/${id}/interventions/generate`),
  getStudentDashboard: (id) => get(`/students/${id}/dashboard`),
  getAttendanceHistory: (id, params) =>
    get(`/students/${id}/attendance`, params),
  getAcademicHistory: (id, params) =>
    get(`/students/${id}/academic-records`, params),

  // Dashboard
  getOverview: (params) => get("/dashboard/overview", params),
  getAttentionStudents: (params) =>
    get("/dashboard/attention-students", params),
  getStudentSummaries: () => get("/dashboard/student-summaries"),

  // Alerts
  listAlerts: (params) => get("/alerts", params),
  getAlert: (id) => get(`/alerts/${id}`),
  resolveAlert: (id) => patch(`/alerts/${id}/resolve`),

  // Interventions
  getIntervention: (id) => get(`/interventions/${id}`),
  updateInterventionStatus: (id, status) =>
    patch(`/interventions/${id}/status`, { status }),

  // Notifications
  listNotifications: (params) => get("/notifications", params),
  getUnreadCount: () => get("/notifications/unread-count"),
  markNotificationRead: (id) => patch(`/notifications/${id}/read`),
  markAllNotificationsRead: () => patch("/notifications/read-all"),

  // Audit
  listAuditLogs: (params) => get("/audit-logs", params),
};
