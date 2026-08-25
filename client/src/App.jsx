import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import AuthPage from '@/pages/AuthPage';
import Overview from '@/pages/Overview';
import Students from '@/pages/Students';
import RiskIntelligence from '@/pages/RiskIntelligence';
import StudentProfile from '@/pages/StudentProfile';
import SmartAlerts from '@/pages/SmartAlerts';
import Interventions from '@/pages/Interventions';
import Outcomes from '@/pages/Outcomes';
import Comparison from '@/pages/Comparison';
import Notifications from '@/pages/Notifications';
import Reports from '@/pages/Reports';
import PulseAI from '@/pages/PulseAI';
import Settings from '@/pages/Settings';
import AuditLogs from '@/pages/AuditLogs';
import StudentDashboard from '@/pages/StudentDashboard';

const STAFF_ROLES = ['ADMIN', 'FACULTY', 'COUNSELOR'];

function RoleRedirect() {
  const { role } = useAuth();
  return <Navigate to={role === 'STUDENT' ? '/student-view' : '/'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthPage />} />

              <Route element={<ProtectedRoute roles={STAFF_ROLES} />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Overview />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/students/:id" element={<StudentProfile />} />
                  <Route path="/risk-intelligence" element={<RiskIntelligence />} />
                  <Route path="/alerts" element={<SmartAlerts />} />
                  <Route path="/interventions" element={<Interventions />} />
                  <Route path="/outcomes" element={<Outcomes />} />
                  <Route path="/comparison" element={<Comparison />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/pulse-ai" element={<PulseAI />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                    <Route path="/audit-logs" element={<AuditLogs />} />
                  </Route>
                </Route>
              </Route>

              <Route path="/student-view" element={<ProtectedRoute />}>
                <Route index element={<StudentDashboard />} />
              </Route>

              <Route path="*" element={<RoleRedirect />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}