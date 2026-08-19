import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Users, Activity, BellRing, Stethoscope, LineChart,
  Bell, FileBarChart2, Sparkles, Settings, GraduationCap, LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

const TEACHER_NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/risk-intelligence', label: 'Risk Intelligence', icon: Activity },
  { to: '/alerts', label: 'Smart Alerts', icon: BellRing },
  { to: '/interventions', label: 'Interventions', icon: Stethoscope },
  { to: '/outcomes', label: 'Outcomes & Impact', icon: LineChart },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/pulse-ai', label: 'Pulse AI', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const STUDENT_NAV = [
  { to: '/student-view', label: 'My Academic Dashboard', icon: GraduationCap, end: true },
  { to: '/notifications', label: 'My Alerts & Notifications', icon: Bell },
];

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const { user, isTeacher, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.show('Logged out successfully', 'info');
    navigate('/login');
  };

  const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 z-50 flex flex-col transition-transform duration-300 border-r border-[#D9E8E7] lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#EDF7F8' }}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0" style={{ borderBottom: '1px solid #D9E8E7' }}>
          <img src="/academic-logo.png" alt="Academic Logo" className="w-10 h-10 object-contain shrink-0" />
          <div className="leading-tight">
            <div className="font-display font-black text-[#153A5B] text-base tracking-tight">ArambhX</div>
            <div className="text-[10px] font-mono tracking-wide font-extrabold" style={{ color: '#2A8588' }}>STUDENT PULSE</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group"
              style={({ isActive }) =>
                isActive
                  ? { background: '#D7EEEE', color: '#153A5B', fontWeight: 700, border: '1px solid #C4E2E2' }
                  : { color: '#153A5B' }
              }
              onMouseEnter={(e) => { if (!e.currentTarget.classList.contains('active-nav')) e.currentTarget.style.background = 'rgba(42,133,136,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = e.currentTarget.getAttribute('aria-current') === 'page' ? '#D7EEEE' : 'transparent'; }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={2} style={{ color: isActive ? '#2A8588' : '#607580' }} />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#2A8588' }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 space-y-2" style={{ borderTop: '1px solid #D9E8E7' }}>
          {isTeacher && (
            <NavLink
              to="/student-view"
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ color: '#153A5B' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42,133,136,0.08)'; e.currentTarget.style.color = '#2A8588'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#153A5B'; }}
            >
              <GraduationCap size={15} className="text-[#2A8588]" />
              <span>Student-facing view</span>
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#C84C4C] hover:bg-[#C84C4C]/10 transition"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
