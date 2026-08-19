import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Send, ArrowRight } from 'lucide-react';
import {
  STUDENTS, ALL_STUDENT_SUMMARIES, ALERTS, INTERVENTIONS, INTERVENTION_OUTCOMES,
  factorsForPrediction, recommendInterventions,
} from '@/data/mockData';
import { RISK_META } from '@/lib/riskUtils';

const SUGGESTED_PROMPTS = [
  'Who needs attention today?',
  'Which students are deteriorating fastest?',
  'Why is Rahul at risk?',
  'Which interventions need follow-up?',
];

function findStudentByName(text) {
  const lower = text.toLowerCase();
  return STUDENTS.find(s => lower.includes(s.name.toLowerCase()) || lower.includes(s.name.split(' ')[0].toLowerCase()));
}

function buildAnswer(text, navigate) {
  const lower = text.toLowerCase();
  const student = findStudentByName(text);

  if (student) {
    const summary = ALL_STUDENT_SUMMARIES.find(s => s.student.id === student.id);
    const factors = factorsForPrediction(summary.prediction.id).slice(0, 3);
    if (lower.includes('why') || lower.includes('risk')) {
      return {
        text: `${student.name}'s risk is ${summary.prediction.risk_probability}% (${RISK_META[summary.prediction.risk_level].label}). Main contributing factors:`,
        list: factors.map(f => `${f.feature_name} ${f.direction === 'NEGATIVE' ? '↓' : '↑'}${Math.abs(f.delta).toFixed(0)}%`),
        actions: [
          { label: 'View Risk Factors', onClick: () => navigate(`/students/${student.id}?tab=why`) },
          { label: 'Recommend Intervention', onClick: () => navigate(`/interventions?student=${student.id}`) },
          { label: 'Open Student', onClick: () => navigate(`/students/${student.id}`) },
        ],
      };
    }
    if (lower.includes('intervention') || lower.includes('assign') || lower.includes('recommend')) {
      const top = recommendInterventions(student.id)[0];
      return {
        text: `For ${student.name}, Pulse recommends "${top.label}" (${top.suitability}% suitability) — ${top.purpose}`,
        actions: [{ label: 'Open Intervention Copilot', onClick: () => navigate(`/interventions?student=${student.id}`) }],
      };
    }
    if (lower.includes('improve') || lower.includes('outcome')) {
      const iv = INTERVENTIONS.find(i => i.student_id === student.id);
      const outcome = iv && INTERVENTION_OUTCOMES.find(o => o.intervention_id === iv.id);
      if (outcome) {
        return {
          text: `${student.name}'s risk moved from ${outcome.before_risk}% to ${outcome.after_risk}% after ${iv.intervention_label}. Outcome: ${outcome.outcome_classification.toLowerCase()}. This is an observed association, not a confirmed cause.`,
          actions: [{ label: 'View Outcome', onClick: () => navigate(`/outcomes?student=${student.id}`) }],
        };
      }
      return { text: `${student.name} doesn't have a completed intervention outcome yet.` };
    }
    return {
      text: `${student.name} is currently ${RISK_META[summary.prediction.risk_level].label.toLowerCase()} risk at ${summary.prediction.risk_probability}%, with ${summary.openAlerts.length} open alert(s) and ${summary.activeInterventions.length} active intervention(s).`,
      actions: [{ label: 'Open Student', onClick: () => navigate(`/students/${student.id}`) }],
    };
  }

  if (lower.includes('who needs attention') || lower.includes('attention today')) {
    const top = [...ALL_STUDENT_SUMMARIES].sort((a, b) => b.priority - a.priority).slice(0, 4);
    return {
      text: 'These students need attention first, based on risk and how fast it is changing:',
      list: top.map(s => `${s.student.name} — ${s.prediction.risk_probability}% risk, priority score ${s.priority}`),
      actions: [{ label: 'Open Priority Queue', onClick: () => navigate('/students') }],
    };
  }

  if (lower.includes('deteriorating fastest') || lower.includes('fastest')) {
    const top = [...ALL_STUDENT_SUMMARIES].sort((a, b) => b.velocity - a.velocity).slice(0, 4);
    return {
      text: 'Ranked by deterioration velocity since the last prediction cycle:',
      list: top.map(s => `${s.student.name} — risk moved +${s.velocity} pts`),
      actions: [{ label: 'Open Risk Intelligence', onClick: () => navigate('/risk-intelligence') }],
    };
  }

  if (lower.includes('follow-up') || lower.includes('followup') || lower.includes('follow up')) {
    const due = INTERVENTIONS.filter(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date()).slice(0, 5);
    return {
      text: `${due.length} interventions have a follow-up date that has passed:`,
      list: due.map(iv => `${STUDENTS.find(s => s.id === iv.student_id)?.name} — ${iv.intervention_label}`),
      actions: [{ label: 'Open Interventions', onClick: () => navigate('/interventions') }],
    };
  }

  if (lower.includes('compare')) {
    return {
      text: 'You can compare up to three students side-by-side in Comparison Mode — attendance, marks, LMS activity and risk trend, with a summary of who should be prioritized.',
      actions: [{ label: 'Open Comparison Mode', onClick: () => navigate('/students') }],
    };
  }

  if (lower.includes('alert')) {
    const open = ALERTS.filter(a => a.status !== 'RESOLVED');
    return {
      text: `There are ${open.length} open alerts, including ${open.filter(a => a.alert_type === 'CRITICAL').length} critical and ${open.filter(a => a.alert_type === 'MULTI_FACTOR').length} multi-factor alerts.`,
      actions: [{ label: 'Open Smart Alerts', onClick: () => navigate('/alerts') }],
    };
  }

  return {
    text: "I can help you find priority students, explain a risk change, recommend interventions, summarize alerts, or compare students. Try asking about a specific student by name.",
  };
}

function Message({ role, content }) {
  if (role === 'user') {
    return <div className="self-end max-w-[85%] rounded-2xl rounded-tr-sm bg-[#ede0dd] text-slate-100 px-3.5 py-2.5 text-sm">{content}</div>;
  }
  return (
    <div className="self-start max-w-[92%] flex gap-2.5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #7a5963, #c98f9f)' }}>
        <Sparkles size={12} className="text-[#fbf3f0]" />
      </div>
      <div className="flex-1">
        <div className="panel-alt px-3.5 py-2.5 text-sm text-slate-200">
          <p>{content.text}</p>
          {content.list && (
            <ul className="mt-2 space-y-1">
              {content.list.map((item, i) => (
                <li key={i} className="text-slate-300 font-mono text-xs flex items-start gap-1.5">
                  <span className="text-teal-400 mt-0.5">›</span>{item}
                </li>
              ))}
            </ul>
          )}
        </div>
        {content.actions && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {content.actions.map((a, i) => (
              <button key={i} onClick={a.onClick} className="chip text-xs px-2.5 py-1.5 rounded-full text-teal-300 flex items-center gap-1">
                {a.label} <ArrowRight size={11} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PulseAIPanel({ open, onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: { text: "I noticed 3 things that may need your attention today. Ask me anything about your students, risk factors, or interventions." } },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function send(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    setTimeout(() => {
      const answer = buildAnswer(q, navigate);
      setMessages((m) => [...m, { role: 'assistant', content: answer }]);
    }, 380);
  }

  return (
    <div className={`fixed bottom-0 right-0 z-[75] w-full sm:w-[400px] h-[min(640px,100vh)] sm:bottom-6 sm:right-6 transition-all duration-300 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="h-full flex flex-col panel-alt shadow-2xl sm:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b hairline shrink-0" style={{ background: 'linear-gradient(90deg, #FFFFFF70, #F6ECE966)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7a5963, #c98f9f)' }}>
              <Sparkles size={14} className="text-[#fbf3f0]" />
            </div>
            <div>
              <div className="text-sm font-display font-semibold text-slate-100">Pulse AI</div>
              <div className="text-[10px] text-slate-400">Decision-support assistant</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} navigate={navigate} />)}
        </div>

        <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
          {SUGGESTED_PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)} className="chip text-[11px] px-2.5 py-1 rounded-full text-slate-300">
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 px-4 py-3.5 border-t hairline shrink-0"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a student, alert, or intervention…"
            className="flex-1 bg-[#ffffff] border hairline rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-teal-400 outline-none"
          />
          <button type="submit" className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#7a5963', color: '#fbf3f0' }}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
