import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Circle, Calendar, MessageCircle, ShieldCheck, Sparkles,
  Send, Bell, CalendarClock, TrendingUp, LogOut,
} from 'lucide-react';
import {
  STUDENTS, ATTENDANCE_RECORDS, ACADEMIC_RECORDS, interventionsForStudent, USERS,
} from '@/data/mockData';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { formatDate } from '@/lib/riskUtils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

const DEFAULT_STUDENT = STUDENTS[0]; // Rahul Mehta

function latestFor(records, studentId) {
  const r = records.filter(x => x.student_id === studentId);
  return r[r.length - 1] || records[0];
}
function prevFor(records, studentId) {
  const r = records.filter(x => x.student_id === studentId);
  return r[r.length - 2] || records[0];
}

const RECOVERY_TASKS = [
  { id: 1, text: 'Attend upcoming tutorial session' },
  { id: 2, text: 'Submit the pending Data Structures assignment' },
  { id: 3, text: 'Meet your academic mentor this week' },
  { id: 4, text: 'Log in to the LMS and review missed lecture notes' },
];

function ProgressCard({ label, value, changeText, positive }) {
  return (
    <div className="rounded-2xl p-5 bg-[#FFFFFF] border border-[#D9E8E7] shadow-sm">
      <div className="text-xs uppercase tracking-wide text-[#607580] font-bold mb-2">{label}</div>
      <div className="font-display text-3xl font-black text-[#153A5B]">{value}%</div>
      <div className={`text-xs font-bold mt-1.5 ${positive ? 'text-[#3A8F6A]' : 'text-[#D9922B]'}`}>{changeText}</div>
    </div>
  );
}

const STUDENT_PROMPTS = ['How am I doing?', 'What should I focus on?', 'When is my next meeting?'];

function buildStudentAnswer(text, ctx) {
  const lower = text.toLowerCase();
  if (lower.includes('doing') || lower.includes('how am i')) {
    return `You're ${ctx.overallLabel.toLowerCase()} right now. ${ctx.attendanceDelta < -3 ? 'Attendance has dipped a bit — that\'s the main thing to watch.' : 'Attendance and coursework are holding steady.'}`;
  }
  if (lower.includes('focus') || lower.includes('should i')) {
    return `Start with your recovery plan tasks — submitting the pending assignment and attending your tutorial will make the biggest difference this week.`;
  }
  if (lower.includes('meeting') || lower.includes('mentor')) {
    return ctx.activeCase ? `Your next check-in with ${ctx.mentor?.name || 'your mentor'} is on ${formatDate(ctx.activeCase.follow_up_date)}.` : `You don't have a scheduled mentor meeting right now.`;
  }
  return "I can help with how you're doing, what to focus on this week, or when your next mentor meeting is — try one of the quick questions below.";
}

function StudentPulseChat({ ctx }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Hi! I'm here to help you understand your progress. What would you like to know?" }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  function send(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setTimeout(() => setMessages((m) => [...m, { role: 'assistant', text: buildStudentAnswer(q, ctx) }]), 320);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-1.5 text-xs font-extrabold px-3 py-2.5 rounded-xl bg-[#153A5B] text-white shadow-md hover:bg-[#0E2942] transition">
        <MessageCircle size={14} /> Start a conversation with Pulse AI
      </button>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-[#D9E8E7] shadow-lg">
      <div ref={scrollRef} className="max-h-56 overflow-y-auto p-3 space-y-2 bg-[#153A5B]">
        {messages.map((m, i) => (
          <div key={i} className={`text-xs px-3 py-2 rounded-xl max-w-[85%] font-medium ${m.role === 'user' ? 'ml-auto bg-[#2A8588] text-white' : 'bg-[#FFFFFF]/20 text-white'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 px-2 pt-2 bg-[#153A5B]">
        {STUDENT_PROMPTS.map((p) => (
          <button key={p} onClick={() => send(p)} className="text-[10px] px-2 py-1 rounded-full text-[#EDF7F8] border border-[#2A8588] font-bold">{p}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 p-2 bg-[#153A5B]">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 bg-[#FFFFFF] rounded-xl px-3 py-1.5 text-xs text-[#153A5B] placeholder:text-[#607580] outline-none font-medium"
        />
        <button type="submit" className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-[#2A8588] text-white">
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, isTeacher, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [done, setDone] = useState({ 2: false });

  const activeStudent = DEFAULT_STUDENT;
  const displayName = user ? user.name : activeStudent.name;
  const rollNo = user ? user.rollNumber : activeStudent.enrollment_number;

  const attendance = latestFor(ATTENDANCE_RECORDS, activeStudent.id);
  const attendancePrev = prevFor(ATTENDANCE_RECORDS, activeStudent.id);
  const academic = latestFor(ACADEMIC_RECORDS, activeStudent.id);
  const academicPrev = prevFor(ACADEMIC_RECORDS, activeStudent.id);
  const interventions = interventionsForStudent(activeStudent.id);
  const activeCase = interventions[0];
  const mentor = activeCase ? USERS.find(u => u.id === activeCase.assigned_to) : null;

  const attendanceDelta = Math.round((attendance.attendance_percent - attendancePrev.attendance_percent) * 10) / 10;
  const marksDelta = Math.round((academic.average_marks - academicPrev.average_marks) * 10) / 10;

  const overallScore = Math.round((attendance.attendance_percent + academic.average_marks + academic.assignment_completion + academic.lms_activity) / 4);
  const overallLabel = overallScore >= 80 ? 'On Track' : overallScore >= 60 ? 'Needs a Little Attention' : 'In Active Recovery';
  const overallColor = overallScore >= 80 ? '#3A8F6A' : overallScore >= 60 ? '#D9922B' : '#C84C4C';

  const handleLogout = () => {
    logout();
    toast.show('Logged out successfully.', 'info');
    navigate('/login');
  };

  function toggleTask(id) {
    setDone((d) => ({ ...d, [id]: !d[id] }));
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#153A5B]">
      <header className="border-b border-[#D9E8E7] bg-[#EDF7F8]">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          {isTeacher ? (
            <Link to="/" className="flex items-center gap-1.5 text-xs text-[#2A8588] hover:underline font-extrabold">
              <ArrowLeft size={13} /> Faculty Command Center
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3A8F6A]" />
              <span className="text-xs font-extrabold text-[#153A5B]">Student Academic Portal</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#D9E8E7] shadow-sm">
              <StudentAvatar name={displayName} size={28} ring="#2A8588" />
              <div className="text-left">
                <span className="text-xs font-black text-[#153A5B] block leading-tight">{displayName}</span>
                <span className="text-[10px] text-[#607580] font-mono block leading-tight">{rollNo}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white border border-[#D9E8E7] text-[#C84C4C] hover:bg-[#C84C4C]/10 transition"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        
        {/* Banner */}
        <div className="bg-[#EDF7F8] border border-[#D9E8E7] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#2A8588] font-mono font-extrabold mb-1">My Student Pulse</div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#153A5B]">Welcome back, {displayName.split(' ')[0]}!</h1>
            <p className="text-xs text-[#607580] mt-1 font-medium">Semester progress and personal academic recovery tracking.</p>
          </div>

          <div className="bg-white px-4 py-2 rounded-2xl border border-[#D9E8E7] shadow-sm flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: overallColor }} />
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#607580] font-bold">Overall Status</div>
              <div className="font-display text-sm font-extrabold" style={{ color: overallColor }}>{overallLabel}</div>
            </div>
          </div>
        </div>

        {/* Meters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProgressCard label="Attendance" value={attendance.attendance_percent} changeText={`${attendanceDelta >= 0 ? '+' : ''}${attendanceDelta}% from last period`} positive={attendanceDelta >= 0} />
          <ProgressCard label="Average Marks" value={academic.average_marks} changeText={`${marksDelta >= 0 ? '+' : ''}${marksDelta}% overall`} positive={marksDelta >= 0} />
          <ProgressCard label="Assignments" value={academic.assignment_completion} changeText="On-time submission rate" positive={academic.assignment_completion >= 75} />
          <ProgressCard label="LMS Activity" value={academic.lms_activity} changeText="Weekly engagement index" positive={academic.lms_activity >= 60} />
        </div>

        {/* Checklist & Support */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#D9E8E7] rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-display font-extrabold text-base text-[#153A5B] flex items-center gap-2">
              <ShieldCheck className="text-[#3A8F6A]" size={18} />
              <span>My Recovery Plan & Assigned Tasks</span>
            </h2>

            <div className="space-y-2">
              {RECOVERY_TASKS.map((t) => {
                const isDone = done[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isDone
                        ? 'bg-[#3A8F6A]/10 border-[#3A8F6A]/30 text-[#607580]'
                        : 'bg-[#F8FAF9] border-[#D9E8E7] hover:border-[#2A8588] text-[#153A5B]'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={18} className="text-[#3A8F6A] shrink-0 mt-0.5" /> : <Circle size={18} className="text-[#607580] shrink-0 mt-0.5" />}
                    <span className={`text-xs font-bold ${isDone ? 'line-through' : ''}`}>{t.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-[#D9E8E7] rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="font-display font-extrabold text-base text-[#153A5B]">Support Case Status</h2>
              <div className="text-xs space-y-2 text-[#607580]">
                <div>
                  <span className="font-bold text-[#153A5B] block">Assigned Mentor:</span>
                  <span>{mentor?.name || 'Dr. Himani Kaur'} ({mentor?.role || 'Faculty'})</span>
                </div>
                {activeCase && (
                  <div>
                    <span className="font-bold text-[#153A5B] block">Next Follow-up Date:</span>
                    <span>{formatDate(activeCase.follow_up_date)}</span>
                  </div>
                )}
              </div>
            </div>

            <StudentPulseChat ctx={{ overallLabel, attendanceDelta, activeCase, mentor }} />
          </div>
        </div>

      </main>
    </div>
  );
}
