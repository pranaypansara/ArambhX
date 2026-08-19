import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, ChevronDown, CalendarDays, Sun, Moon, Settings as SettingsIcon } from 'lucide-react';
import { STUDENTS, NOTIFICATIONS, CURRENT_USER } from '@/data/mockData';
import StudentAvatar from '@/components/ui/StudentAvatar';

export default function Topbar({ onOpenMobile }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-contrast', highContrast);
  }, [highContrast]);

  const unread = NOTIFICATIONS.filter(n => !n.is_read).length;

  const results = query.length > 1
    ? STUDENTS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.enrollment_number.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    function onClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setShowResults(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b hairline bg-[#ede0dd]/90 backdrop-blur px-4 lg:px-6 flex items-center gap-4">
      <button className="lg:hidden text-slate-300" onClick={onOpenMobile}>
        <Menu size={20} />
      </button>

      <div className="relative flex-1 max-w-md" ref={boxRef}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder="Search students by name or enrollment no."
          className="w-full bg-[#ffffff] border hairline rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-teal-400 outline-none transition-colors"
        />
        {showResults && results.length > 0 && (
          <div className="absolute top-full mt-2 left-0 right-0 panel-alt shadow-xl overflow-hidden count-up">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => { navigate(`/students/${s.id}`); setShowResults(false); setQuery(''); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left"
              >
                <StudentAvatar name={s.name} size={28} />
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 truncate">{s.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{s.enrollment_number} · {s.department}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-mono px-3 py-1.5 rounded-md" style={{ background: '#FFFFFF70' }}>
        <CalendarDays size={13} />
        Odd Semester · 2026-27
      </div>

      <button
        onClick={() => setHighContrast(v => !v)}
        title={highContrast ? 'Switch to standard contrast' : 'Switch to high contrast'}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 shrink-0"
      >
        {highContrast ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <button
        onClick={() => navigate('/settings')}
        title="Settings"
        className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 shrink-0"
      >
        <SettingsIcon size={17} />
      </button>

      <button
        onClick={() => navigate('/notifications')}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 shrink-0"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full pulse-dot" style={{ background: '#ef6355' }} />
        )}
      </button>

      <div className="flex items-center gap-2.5 pl-2 border-l hairline shrink-0">
        <StudentAvatar name={CURRENT_USER.name} size={34} ring="#7a5963" />
        <div className="hidden md:block leading-tight">
          <div className="text-sm text-slate-200 font-medium">{CURRENT_USER.name}</div>
          <div className="text-[11px] text-slate-500">{CURRENT_USER.role === 'FACULTY' ? 'Faculty' : CURRENT_USER.role}</div>
        </div>
        <ChevronDown size={14} className="text-slate-500 hidden md:block" />
      </div>
    </header>
  );
}
