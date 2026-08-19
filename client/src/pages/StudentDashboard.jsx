import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Circle, MessageCircle, ShieldCheck,
  Send, LogOut, UserRound,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { formatDate, statusLabel } from '@/lib/riskUtils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useAsyncData, INTERVENTION_TYPE_META } from '@/services/data';
import { api } from '@/services/api';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';

function latestValue(records, getter) {
  if (!records || records.length === 0) return null;
  const last = records[records.length - 1];
  const v = getter(last);
  return typeof v === 'number' ? v : parseFloat(v || 0);
}

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

function buildStudentAnswer(text) {
  const lower = text.toLowerCase();
  if (lower.includes('doing') || lower.includes('how am i')) {
    return "Your profile is loaded from your academic records and support plan. Keep your upcoming tasks and check-ins top of mind.";
  }
  if (lower.includes('focus') || lower.includes('should i')) {
    return "Focus on the tasks in your recovery plan below. Completing them is the biggest lever for this term.";
  }
  if (lower.includes('meeting') || lower.includes('mentor')) {
    return "You can see your assigned support case status on the right. Message your mentor or the faculty helpline for scheduling.";
  }
  return "I can help with how you're doing, what to focus on this week, or when your next mentor meeting is — try one of the quick questions below.";
}

function StudentPulseChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Hi! I'm here to help you understand your progress. What would you like to know?" }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  function send(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setTimeout(() => setMessages((m) => [...m, { role: 'assistant', text: buildStudentAnswer(q) }]), 320);
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
  const { user, role, isStaff, studentId, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [done, setDone] = useState({});

  const targetStudentId = role === 'STUDENT' ? studentId : null;

  const { data, loading, error, reload } = useAsyncData(async () => {
    // Staff preview: use the first available student.
    let sid = targetStudentId;
    if (!sid) {
      const list = await api.listStudents({ page: 1, limit: 1 });
      sid = list?.data?.students?.[0]?.id ?? null;
      if (!sid) return { student: null, activeCase: null, attendance: null, academic: null };
    }
    const [dashRes, attRes, acaRes] = await Promise.allSettled([
      api.getStudentDashboard(sid),
      api.getAttendanceHistory(sid, { page: 1, limit: 20 }),
      api.getAcademicHistory(sid, { page: 1, limit: 20 }),
    ]);
    const dash = dashRes.status === 'fulfilled' ? dashRes.value?.data : null;
    const attendance = attRes.status === 'fulfilled' ? attRes.value?.data?.attendance || [] : [];
    const academic = acaRes.status === 'fulfilled' ? acaRes.value?.data?.academicRecords || [] : [];
    const interventions = dash?.latestInterventions || [];
    const activeCase = interventions[0] || null;
    return { student: dash?.student || null, activeCase, attendance, academic };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetStudentId]);

  const handleLogout = () => {
    logout();
    toast.show('Logged out successfully.', 'info');
    navigate('/login');
  };

  const attendance = latestValue(data?.attendance, (r) => r.attendancePercentage);
  const academicM = latestValue(data?.academic, (r) => r.averageMarks);
  const assignment = latestValue(data?.academic, (r) => r.assignmentCompletion);
  const lms = latestValue(data?.academic, (r) => r.lmsActivity);

  const displayName = data?.student?.name || user?.name || 'Student';
  const rollNo = data?.student?.enrollmentNumber || '';
  const activeCase = data?.activeCase;

  const scores = { attendance, academicM, assignment, lms };
  const computed = Object.values(scores).filter((v) => v !== null);
  const overallScore = computed.length ? Math.round(computed.reduce((a, b) => a + b, 0) / computed.length) : null;
  const overallLabel = overallScore == null ? 'No data yet' : overallScore >= 80 ? 'On Track' : overallScore >= 60 ? 'Needs a Little Attention' : 'In Active Recovery';
  const overallColor = overallScore == null ? '#607580' : overallScore >= 80 ? '#3A8F6A' : overallScore >= 60 ? '#D9922B' : '#C84C4C';

  function toggleTask(id) {
    setDone((d) => ({ ...d, [id]: !d[id] }));
  }

  const taskItems = activeCase
    ? [
        { id: `${activeCase.id}-1`, text: `${INTERVENTION_TYPE_META[activeCase.type]?.label || activeCase.type.replace(/_/g, ' ')} is active (${statusLabel(activeCase.status)})` },
        { id: `${activeCase.id}-2`, text: 'Keep up with your attendance and on-time assignment submissions' },
        { id: `${activeCase.id}-3`, text: 'Message your mentor or the faculty helpline if anything changes' },
      ]
    : [
        { id: 'none-1', text: 'No active support case — stay on top of your attendance and submissions' },
      ];

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#153A5B]">
      <header className="border-b border-[#D9E8E7] bg-[#EDF7F8]">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          {isStaff ? (
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
                <span className="text-[10px] text-[#607580] font-mono block leading-tight">{rollNo || role}</span>
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
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-36" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          </div>
        ) : error ? (
          <ErrorState title="Could not load your dashboard" description={error.message} onRetry={reload} />
        ) : !data?.student ? (
          <EmptyState icon={UserRound} title="No student profile linked" description="Your account isn't linked to a student profile yet. Contact an administrator." />
        ) : (
          <>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProgressCard label="Attendance" value={Math.round(attendance ?? 0)} changeText="Latest recorded period" positive={(attendance ?? 0) >= 75} />
              <ProgressCard label="Average Marks" value={Math.round(academicM ?? 0)} changeText="Latest assessment period" positive={(academicM ?? 0) >= 60} />
              <ProgressCard label="Assignments" value={Math.round(assignment ?? 0)} changeText="On-time submission rate" positive={(assignment ?? 0) >= 75} />
              <ProgressCard label="LMS Activity" value={Math.round(lms ?? 0)} changeText="Weekly engagement index" positive={(lms ?? 0) >= 60} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-[#D9E8E7] rounded-3xl p-6 shadow-sm space-y-4">
                <h2 className="font-display font-extrabold text-base text-[#153A5B] flex items-center gap-2">
                  <ShieldCheck className="text-[#3A8F6A]" size={18} />
                  <span>My Recovery Plan & Assigned Tasks</span>
                </h2>

                <div className="space-y-2">
                  {taskItems.map((t) => {
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
                  {activeCase ? (
                    <div className="text-xs space-y-2 text-[#607580]">
                      <div>
                        <span className="font-bold text-[#153A5B] block">Active intervention:</span>
                        <span>{INTERVENTION_TYPE_META[activeCase.type]?.label || activeCase.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#153A5B] block">Status:</span>
                        <span>{statusLabel(activeCase.status)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#607580]">No active support case right now.</p>
                  )}
                </div>

                <StudentPulseChat />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}