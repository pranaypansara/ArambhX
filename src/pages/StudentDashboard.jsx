import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Circle, Calendar, MessageCircle, ShieldCheck, Sparkles,
  Send, Bell, CalendarClock, TrendingUp,
} from 'lucide-react';
import {
  STUDENTS, ATTENDANCE_RECORDS, ACADEMIC_RECORDS, interventionsForStudent, USERS,
} from '@/data/mockData';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { formatDate } from '@/lib/riskUtils';

const STUDENT = STUDENTS[0]; // demo: Rahul Mehta

function latestFor(records) {
  const r = records.filter(x => x.student_id === STUDENT.id);
  return r[r.length - 1];
}
function prevFor(records) {
  const r = records.filter(x => x.student_id === STUDENT.id);
  return r[r.length - 2];
}

const RECOVERY_TASKS = [
  { id: 1, text: 'Attend upcoming tutorial session' },
  { id: 2, text: 'Submit the pending Data Structures assignment' },
  { id: 3, text: 'Meet your academic mentor this week' },
  { id: 4, text: 'Log in to the LMS and review missed lecture notes' },
];

function ProgressCard({ label, value, changeText, positive }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#faf8f2', border: '1px solid #e4ddc9' }}>
      <div className="text-xs uppercase tracking-wide text-[#8a7f63] mb-2">{label}</div>
      <div className="font-display text-3xl font-bold text-[#3a2a2e]">{value}%</div>
      <div className={`text-xs mt-1.5 ${positive ? 'text-emerald-700' : 'text-amber-700'}`}>{changeText}</div>
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
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-lg" style={{ background: '#3a2a2e', color: '#e7eef3' }}>
        <MessageCircle size={13} /> Start a conversation
      </button>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#3a2a2e' }}>
      <div ref={scrollRef} className="max-h-56 overflow-y-auto p-3 space-y-2" style={{ background: '#3a2a2e' }}>
        {messages.map((m, i) => (
          <div key={i} className={`text-xs px-2.5 py-2 rounded-lg max-w-[85%] ${m.role === 'user' ? 'ml-auto bg-teal-500 text-[#fbf3f0]' : 'bg-[#F6ECE966] text-slate-200'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 px-2 pt-2" style={{ background: '#3a2a2e' }}>
        {STUDENT_PROMPTS.map((p) => (
          <button key={p} onClick={() => send(p)} className="text-[10px] px-2 py-1 rounded-full text-slate-300 border border-slate-700">{p}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 p-2" style={{ background: '#3a2a2e' }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 bg-[#f6ece9] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none"
        />
        <button type="submit" className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#7a5963', color: '#fbf3f0' }}>
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}

export default function StudentDashboard() {
  const [done, setDone] = useState({ 2: false });
  const attendance = latestFor(ATTENDANCE_RECORDS);
  const attendancePrev = prevFor(ATTENDANCE_RECORDS);
  const academic = latestFor(ACADEMIC_RECORDS);
  const academicPrev = prevFor(ACADEMIC_RECORDS);
  const interventions = interventionsForStudent(STUDENT.id);
  const activeCase = interventions[0];
  const mentor = activeCase ? USERS.find(u => u.id === activeCase.assigned_to) : null;

  const attendanceDelta = Math.round((attendance.attendance_percent - attendancePrev.attendance_percent) * 10) / 10;
  const marksDelta = Math.round((academic.average_marks - academicPrev.average_marks) * 10) / 10;

  const changes = [
    attendanceDelta < -3 && `Your attendance has decreased recently, from ${attendancePrev.attendance_percent}% to ${attendance.attendance_percent}%.`,
    academic.assignment_completion < 70 && 'You have pending assignments that need submission.',
    marksDelta >= -2 && marksDelta <= 2 && 'Your academic performance is stable compared to last period.',
    academic.lms_activity < 50 && 'Your recent LMS activity is lower than usual — try logging in more regularly.',
  ].filter(Boolean);

  const overallScore = Math.round((attendance.attendance_percent + academic.average_marks + academic.assignment_completion + academic.lms_activity) / 4);
  const overallLabel = overallScore >= 80 ? 'On Track' : overallScore >= 60 ? 'Needs a Little Attention' : 'In Active Recovery';
  const overallColor = overallScore >= 80 ? '#2f8f4e' : overallScore >= 60 ? '#a97a1f' : '#b8492f';

  const studentNotifications = [
    { icon: CalendarClock, text: activeCase ? `Upcoming check-in with ${mentor?.name || 'your mentor'} on ${formatDate(activeCase.follow_up_date)}.` : 'No upcoming meetings scheduled.' },
    { icon: TrendingUp, text: marksDelta >= 0 ? 'Your academic performance held steady or improved last period — nice work.' : 'Your marks dipped slightly last period — tutoring support is available if useful.' },
    { icon: Bell, text: 'A new tutorial slot was added this week — check My Recovery Plan.' },
  ];

  function toggleTask(id) {
    setDone((d) => ({ ...d, [id]: !d[id] }));
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-paper)', color: 'var(--color-ink)' }}>
      <header className="border-b" style={{ borderColor: '#e4ddc9' }}>
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-[#8a7f63] hover:text-[#3a2a2e]">
            <ArrowLeft size={13} /> Faculty view
          </Link>
          <div className="flex items-center gap-2.5">
            <StudentAvatar name={STUDENT.name} size={32} />
            <span className="text-sm font-medium">{STUDENT.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-[#8a7f63] font-mono mb-1">My Student Pulse</div>
          <h1 className="font-display text-2xl font-bold">Here's how your semester is going</h1>
        </div>

        <div className="rounded-2xl p-5 mb-6 flex items-center gap-4" style={{ background: '#faf8f2', border: '1px solid #e4ddc9' }}>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: overallColor }} />
          <div>
            <div className="text-xs uppercase tracking-wide text-[#8a7f63]">Overall Progress</div>
            <div className="font-display text-lg font-semibold" style={{ color: overallColor }}>{overallLabel}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <ProgressCard label="Attendance" value={attendance.attendance_percent} changeText={attendanceDelta >= 0 ? `+${attendanceDelta} pts` : `${attendanceDelta} pts`} positive={attendanceDelta >= 0} />
          <ProgressCard label="Academic Performance" value={Math.round(academic.average_marks)} changeText={marksDelta >= 0 ? `+${marksDelta} pts` : `${marksDelta} pts`} positive={marksDelta >= 0} />
          <ProgressCard label="Assignment Progress" value={Math.round(academic.assignment_completion)} changeText="Completion rate" positive={academic.assignment_completion >= 70} />
          <ProgressCard label="LMS Engagement" value={academic.lms_activity} changeText="Last 3 weeks" positive={academic.lms_activity >= 60} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl p-5" style={{ background: '#faf8f2', border: '1px solid #e4ddc9' }}>
              <h2 className="font-display font-semibold mb-3">What Changed?</h2>
              <ul className="space-y-2">
                {changes.map((c, i) => (
                  <li key={i} className="text-sm text-[#3c3626] flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-[#8a7f63] shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl p-5" style={{ background: '#faf8f2', border: '1px solid #e4ddc9' }}>
              <h2 className="font-display font-semibold mb-1">My Recovery Plan</h2>
              <p className="text-xs text-[#8a7f63] mb-4">Weekly actionable tasks — check them off as you go.</p>
              <div className="space-y-1">
                {RECOVERY_TASKS.map((t) => (
                  <button key={t.id} onClick={() => toggleTask(t.id)} className="w-full flex items-center gap-3 py-2.5 text-left border-b last:border-0" style={{ borderColor: '#e4ddc9' }}>
                    {done[t.id] ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <Circle size={18} className="text-[#c9c0a4] shrink-0" />}
                    <span className={`text-sm ${done[t.id] ? 'line-through text-[#8a7f63]' : 'text-[#3c3626]'}`}>{t.text}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl p-5" style={{ background: '#faf8f2', border: '1px solid #e4ddc9' }}>
              <h2 className="font-display font-semibold mb-3">Notifications</h2>
              <div className="space-y-3">
                {studentNotifications.map((n, i) => {
                  const Icon = n.icon;
                  return (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-[#3c3626]">
                      <Icon size={14} className="text-[#8a7f63] mt-0.5 shrink-0" />
                      {n.text}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl p-5" style={{ background: '#3a2a2e' }}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={16} className="text-teal-400" />
                <h2 className="font-display font-semibold text-slate-100">Support Status</h2>
              </div>
              {activeCase ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Assigned mentor</div>
                    <div className="text-slate-200 mt-0.5">{mentor?.name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Next action</div>
                    <div className="text-slate-200 mt-0.5">{activeCase.intervention_label}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Next meeting</div>
                    <div className="text-slate-200 mt-0.5 flex items-center gap-1.5"><Calendar size={12} />{formatDate(activeCase.follow_up_date)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Case status</div>
                    <div className="text-slate-200 mt-0.5">{activeCase.status.replace('_', ' ')}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No active support case right now — keep up the good work.</p>
              )}
            </section>

            <section className="rounded-2xl p-5" style={{ background: '#faf8f2', border: '1px solid #e4ddc9' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-[#8a7f63]" />
                <h2 className="font-display font-semibold text-sm">Ask Pulse AI</h2>
              </div>
              <p className="text-xs text-[#6b6249] mb-3">Get simple, constructive answers about your progress and next steps.</p>
              <StudentPulseChat ctx={{ overallLabel, attendanceDelta, activeCase, mentor }} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
