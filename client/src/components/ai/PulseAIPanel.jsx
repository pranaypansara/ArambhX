import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Send, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';
import {
  fetchSummaries, mapAlert,
  FACTOR_RULES, isOverdueIntervention,
} from '@/services/data';
import { RISK_META } from '@/lib/riskUtils';

const SUGGESTED_PROMPTS = [
  'Who needs attention today?',
  'Which students are deteriorating fastest?',
  'Why is a student at risk?',
  'Which interventions need follow-up?',
];

function findStudentByName(text, summaries) {
  const lower = text.toLowerCase();
  return summaries.find(
    (s) =>
      s.student?.name &&
      (lower.includes(s.student.name.toLowerCase()) ||
        lower.includes((s.student.name.split(' ')[0] || '').toLowerCase()))
  )?.student;
}

function factorsForStudent(mlFeatures) {
  if (!Array.isArray(mlFeatures)) return [];
  return mlFeatures
    .map((f) => {
      const rule = FACTOR_RULES.find((r) => r.key === (f.feature_id || f.featureId));
      if (!rule) return null;
      const v = f.feature_value ?? f.featureValue;
      return `${rule.label} ${v}`;
    })
    .filter(Boolean)
    .slice(0, 3);
}

async function buildAnswer(text, navigate, ctx) {
  const lower = text.toLowerCase();
  const { summaries, alerts } = ctx;

  if (lower.includes('why is a student at risk') || lower.includes('at risk')) {
    const student = findStudentByName(text.replace('why is a student at risk', 'tom'), summaries) || summaries[0]?.student;
    if (!student) return { text: "No student data loaded yet." };
    let factors = [];
    try {
      const res = await api.getStudentMlFeatures(student.id);
      factors = factorsForStudent(res?.data?.mlFeatures);
    } catch {
      factors = [];
    }
    const summary = summaries.find((s) => s.student?.id === student.id);
    const meta = RISK_META[summary?.prediction?.risk_level] || RISK_META.LOW;
    return {
      text: `${student.name}'s risk is ${summary?.prediction?.probability ?? '—'}% (${meta.label}). Main contributing factors:`,
      list: factors.length ? factors : [
        `prediction history: ${summary?.history?.length || 0} cycle(s)`,
        `velocity: ${summary?.velocity > 0 ? '+' : ''}${Math.round(summary?.velocity || 0)} pts`,
      ],
      actions: [
        { label: 'View Risk Factors', onClick: () => navigate(`/students/${student.id}?tab=why`) },
        { label: 'Open Student', onClick: () => navigate(`/students/${student.id}`) },
      ],
    };
  }

  if (lower.includes('who needs attention') || lower.includes('attention today')) {
    const top = [...summaries].sort((a, b) => b.priority - a.priority).slice(0, 4);
    return {
      text: 'These students need attention first, based on risk and how fast it is changing:',
      list: top.map((s) => `${s.student?.name} — ${s.prediction?.probability ?? '—'}% risk, priority score ${Math.round(s.priority || 0)}`),
      actions: [{ label: 'Open Priority Queue', onClick: () => navigate('/students') }],
    };
  }

  if (lower.includes('deteriorating fastest') || lower.includes('fastest')) {
    const top = [...summaries].sort((a, b) => (b.velocity || 0) - (a.velocity || 0)).slice(0, 4);
    return {
      text: 'Ranked by deterioration velocity since the last prediction cycle:',
      list: top.map((s) => `${s.student?.name} — risk moved ${s.velocity > 0 ? '+' : ''}${Math.round(s.velocity || 0)} pts`),
      actions: [{ label: 'Open Risk Intelligence', onClick: () => navigate('/risk-intelligence') }],
    };
  }

  if (lower.includes('follow-up') || lower.includes('followup') || lower.includes('follow up')) {
    const due = summaries.flatMap((s) => (s.allInterventions || [])
      .filter(isOverdueIntervention)
      .map((iv) => ({ student: s.student, iv })));
    return {
      text: `${due.length} active intervention(s) have a follow-up date that has passed:`,
      list: due.slice(0, 5).map(({ student, iv }) => `${student?.name} — ${iv.intervention_type.replace(/_/g, ' ').toLowerCase()}`),
      actions: [{ label: 'Open Interventions', onClick: () => navigate('/interventions') }],
    };
  }

  if (lower.includes('compare')) {
    return {
      text: 'You can compare up to three students side-by-side in Comparison Mode — risk, trend, alerts and interventions, with a summary of who should be prioritized.',
      actions: [{ label: 'Open Comparison Mode', onClick: () => navigate('/students') }],
    };
  }

  if (lower.includes('alert')) {
    const open = (alerts || []).filter((a) => a.status !== 'RESOLVED');
    return {
      text: `There are ${open.length} open alerts, including ${open.filter((a) => a.alertType === 'CRITICAL').length} critical and ${open.filter((a) => a.alertType === 'MULTI_FACTOR').length} multi-factor alerts.`,
      actions: [{ label: 'Open Smart Alerts', onClick: () => navigate('/alerts') }],
    };
  }

  const student = findStudentByName(text, summaries);
  if (student) {
    const summary = summaries.find((s) => s.student?.id === student.id);
    const meta = RISK_META[summary?.prediction?.risk_level] || RISK_META.LOW;
    return {
      text: `${student.name} is currently ${meta.label.toLowerCase()} risk at ${summary?.prediction?.probability ?? '—'}%, with ${summary?.openAlerts?.length || 0} open alert(s) and ${summary?.activeInterventions?.length || 0} active intervention(s).`,
      actions: [{ label: 'Open Student', onClick: () => navigate(`/students/${student.id}`) }],
    };
  }

  return {
    text: "I can find priority students, explain a risk change, recommend interventions, summarize alerts, or compare students. Try one of the suggestions below.",
  };
}

function Message({ role, content }) {
  if (role === 'user') {
    return <div className="self-end max-w-[85%] rounded-2xl rounded-tr-sm bg-[#ede0dd] text-slate-700 px-3.5 py-2.5 text-sm">{content}</div>;
  }
  return (
    <div className="self-start max-w-[92%] flex gap-2.5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #7a5963, #c98f9f)' }}>
        <Sparkles size={12} className="text-[#fbf3f0]" />
      </div>
      <div className="flex-1">
        <div className="panel-alt px-3.5 py-2.5 text-sm text-slate-700">
          <p>{content.text}</p>
          {content.list && (
            <ul className="mt-2 space-y-1">
              {content.list.map((item, i) => (
                <li key={i} className="text-slate-600 font-mono text-xs flex items-start gap-1.5">
                  <span className="text-teal-600 mt-0.5">›</span>{item}
                </li>
              ))}
            </ul>
          )}
        </div>
        {content.actions && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {content.actions.map((a, i) => (
              <button key={i} onClick={a.onClick} className="chip text-xs px-2.5 py-1.5 rounded-full text-teal-600 flex items-center gap-1">
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
  const ctxRef = useRef({ summaries: [], alerts: [] });
  const [messages, setMessages] = useState([
    { role: 'assistant', content: { text: "I can help you find priority students, explain a risk change, or summarize alerts. Ask about your students in plain language." } },
  ]);
  const [input, setInput] = useState('');
  const [ready, setReady] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [summaries, alertRes] = await Promise.all([
          fetchSummaries(),
          api.listAlerts({ page: 1, limit: 100 }),
        ]);
        if (!active) return;
        ctxRef.current = {
          summaries: summaries || [],
          alerts: (alertRes?.data?.alerts || []).map(mapAlert),
        };
        setReady(true);
      } catch {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || !ready) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    const answer = await buildAnswer(q, navigate, ctxRef.current);
    setMessages((m) => [...m, { role: 'assistant', content: answer }]);
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
              <div className="text-sm font-display font-semibold text-slate-800">Pulse AI</div>
              <div className="text-[10px] text-slate-500">Decision-support assistant</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
        </div>

        <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
          {SUGGESTED_PROMPTS.map((p) => (
            <button key={p} onClick={() => { if (ready) send(p); }} className="chip text-[11px] px-2.5 py-1 rounded-full text-slate-600">
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
            placeholder={ready ? "Ask about a student, alert, or intervention…" : "Loading cohort…"}
            className="flex-1 bg-panel border hairline rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-400 outline-none"
          />
          <button type="submit" disabled={!ready} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40" style={{ background: '#7a5963', color: '#fbf3f0' }}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}