import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, CalendarDays, Sun, Moon, Settings as SettingsIcon, LogOut } from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/services/api';

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  FACULTY: 'Faculty',
  COUNSELOR: 'Counselor',
  STUDENT: 'Student',
};

export default function Topbar({ onOpenMobile }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [unread, setUnread] = useState(0);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const { user, role, isStaff, logout } = useAuth();
  const toast = useToast();

  const loadUnread = () => {
    api.getUnreadCount()
      .then((res) => setUnread(res?.data?.unreadCount ?? 0))
      .catch(() => {});
  };

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 30_000);
    return () => clearInterval(t);
  }, []);

  // Student search (staff only) against the real student registry.
  useEffect(() => {
    if (!isStaff || query.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      api.listStudents({ page: 1, limit: 200 })
        .then((res) => {
          if (!alive) return;
          const q = query.toLowerCase();
          const hits = (res?.data?.students || []).filter(
            (s) => s.name.toLowerCase().includes(q) || (s.enrollmentNumber || '').toLowerCase().includes(q)
          ).slice(0, 6);
          setResults(hits);
        })
        .catch(() => { if (alive) setResults([]); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [query, isStaff]);

  useEffect(() => {
    function onClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setShowResults(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    toast.show('You have been logged out.', 'info');
    navigate('/login');
  };

  const displayName = user ? user.name : 'Guest User';
  const displayRole = user ? (ROLE_LABELS[role] || role) : 'Guest';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-hairline bg-panel-alt/95 backdrop-blur px-4 lg:px-6 flex items-center justify-between gap-4">

      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button className="lg:hidden text-ink" onClick={onOpenMobile}>
          <Menu size={20} />
        </button>

        {isStaff && (
          <div className="relative flex-1" ref={boxRef}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder="Search students by name or enrollment no."
              className="w-full bg-panel border border-hairline rounded-xl pl-9 pr-3 py-2 text-sm text-ink placeholder:text-slate-500 focus:border-teal outline-none transition-colors shadow-sm font-medium"
            />
            {showResults && results.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-panel border border-hairline rounded-xl shadow-xl overflow-hidden count-up z-50">
                {results.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { navigate(`/students/${s.id}`); setShowResults(false); setQuery(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-panel-alt text-left border-b border-hairline last:border-0"
                  >
                    <StudentAvatar name={s.name} size={28} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-ink truncate">{s.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{s.enrollmentNumber} · {s.department}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-ink font-mono font-bold px-3 py-1.5 rounded-xl border border-hairline bg-panel">
          <CalendarDays size={13} className="text-teal" />
          Odd Semester · 2026-27
        </div>

        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-ink hover:bg-panel border border-transparent hover:border-hairline shrink-0 transition"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          onClick={() => navigate('/settings')}
          title="Settings"
          className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-ink hover:bg-panel border border-transparent hover:border-hairline shrink-0 transition"
        >
          <SettingsIcon size={17} />
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-ink hover:bg-panel border border-transparent hover:border-hairline shrink-0 transition"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-coral-dim text-white text-[9px] font-black flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-hairline shrink-0 bg-panel px-3 py-1 rounded-xl shadow-sm border border-hairline">
          <StudentAvatar name={displayName} size={30} ring="#2A8588" />
          <div className="leading-tight">
            <div className="text-xs font-black text-ink whitespace-nowrap">{displayName}</div>
            <div className="text-[10px] text-teal font-extrabold uppercase">{displayRole}</div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="ml-1 p-1 rounded-lg hover:bg-coral-dim/15 text-coral-dim transition"
          >
            <LogOut size={15} />
          </button>
        </div>

      </div>

    </header>
  );
}