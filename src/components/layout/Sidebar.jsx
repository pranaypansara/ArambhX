import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Users, Activity, BellRing, Stethoscope, LineChart,
  Bell, FileBarChart2, Sparkles, Settings, Waves, GraduationCap,
} from 'lucide-react';

const NAV = [
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

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#7A5963' }}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.14)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#E7B6C5' }}>
            <Waves size={16} className="text-[#5C4249]" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-sm tracking-tight" style={{ color: '#FBF3F0' }}>ARAMBH ASCEND</div>
            <div className="text-[10px] font-mono tracking-wide" style={{ color: '#D8B9BE' }}>STUDENT PULSE</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group"
              style={({ isActive }) =>
                isActive
                  ? { background: '#E7B6C5', color: '#5C4249', fontWeight: 500 }
                  : { color: '#E5CBCF' }
              }
              onMouseEnter={(e) => { if (!e.currentTarget.classList.contains('active-nav')) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = e.currentTarget.getAttribute('aria-current') === 'page' ? '#E7B6C5' : 'transparent'; }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={2} style={{ color: isActive ? '#5C4249' : '#D8B9BE' }} />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#7a5963' }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }}>
          <NavLink
            to="/student-view"
            onClick={onCloseMobile}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{ color: '#D8B9BE' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#FBF3F0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#D8B9BE'; }}
          >
            <GraduationCap size={16} />
            <span>Student-facing view</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
