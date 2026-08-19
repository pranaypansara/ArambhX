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
    <header className="sticky top-0 z-30 h-16 border-b border-[#D9E8E7] bg-[#EDF7F8]/95 backdrop-blur px-4 lg:px-6 flex items-center justify-between gap-4">
      
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button className="lg:hidden text-[#153A5B]" onClick={onOpenMobile}>
          <Menu size={20} />
        </button>

        <div className="relative flex-1" ref={boxRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2A8588]" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search students by name or enrollment no."
            className="w-full bg-[#FFFFFF] border border-[#D9E8E7] rounded-xl pl-9 pr-3 py-2 text-sm text-[#153A5B] placeholder:text-[#607580] focus:border-[#2A8588] outline-none transition-colors shadow-sm font-medium"
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-[#FFFFFF] border border-[#D9E8E7] rounded-xl shadow-xl overflow-hidden count-up z-50">
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { navigate(`/students/${s.id}`); setShowResults(false); setQuery(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#EDF7F8] text-left border-b border-[#D9E8E7] last:border-0"
                >
                  <StudentAvatar name={s.name} size={28} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#153A5B] truncate">{s.name}</div>
                    <div className="text-[11px] text-[#607580] font-mono">{s.enrollment_number} · {s.department}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#153A5B] font-mono font-bold px-3 py-1.5 rounded-xl border border-[#D9E8E7] bg-[#FFFFFF]">
          <CalendarDays size={13} className="text-[#2A8588]" />
          Odd Semester · 2026-27
        </div>

        <button
          onClick={() => setHighContrast(v => !v)}
          title={highContrast ? 'Switch to standard contrast' : 'Switch to high contrast'}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[#153A5B] hover:bg-[#FFFFFF] border border-transparent hover:border-[#D9E8E7] shrink-0 transition"
        >
          {highContrast ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          onClick={() => navigate('/settings')}
          title="Settings"
          className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-[#153A5B] hover:bg-[#FFFFFF] border border-transparent hover:border-[#D9E8E7] shrink-0 transition"
        >
          <SettingsIcon size={17} />
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[#153A5B] hover:bg-[#FFFFFF] border border-transparent hover:border-[#D9E8E7] shrink-0 transition"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full pulse-dot bg-[#C84C4C]" />
          )}
        </button>

        {/* DR. HIMANI KAUR PROFILE BADGE */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#D9E8E7] shrink-0 bg-[#FFFFFF] px-3 py-1.5 rounded-xl shadow-sm border border-[#D9E8E7]">
          <StudentAvatar name={CURRENT_USER.name} size={32} ring="#2A8588" />
          <div className="leading-tight">
            <div className="text-xs font-black text-[#153A5B] whitespace-nowrap">{CURRENT_USER.name}</div>
            <div className="text-[10px] text-[#2A8588] font-extrabold uppercase">{CURRENT_USER.role === 'FACULTY' ? 'Faculty' : CURRENT_USER.role}</div>
          </div>
          <ChevronDown size={14} className="text-[#153A5B] shrink-0" />
        </div>

      </div>

    </header>
  );
}
