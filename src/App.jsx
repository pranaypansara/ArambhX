import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import AppShell from '@/components/layout/AppShell';
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
import StudentDashboard from '@/pages/StudentDashboard';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
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
          </Route>
          <Route path="/student-view" element={<StudentDashboard />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
