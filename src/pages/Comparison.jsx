import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, X, Plus } from 'lucide-react';
import { STUDENTS, ALL_STUDENT_SUMMARIES, ATTENDANCE_RECORDS, ACADEMIC_RECORDS } from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import StudentAvatar from '@/components/ui/StudentAvatar';
import RiskBadge from '@/components/ui/RiskBadge';
import { EmptyState } from '@/components/ui/States';

function latestFor(records, studentId) {
  const r = records.filter(x => x.student_id === studentId);
  return r[r.length - 1];
}

function trendArrows(velocity) {
  if (velocity > 5) return '↑↑';
  if (velocity > 1) return '↑';
  if (velocity < -1) return '↓';
  return '→';
}

export default function Comparison() {
  const [params, setParams] = useSearchParams();
  const idsFromUrl = (params.get('ids') || '').split(',').filter(Boolean);
  const [selected, setSelected] = useState(idsFromUrl.length ? idsFromUrl : []);
  const [picker, setPicker] = useState(false);

  const summaries = selected.map(id => ALL_STUDENT_SUMMARIES.find(s => s.student.id === id)).filter(Boolean);

  function addStudent(id) {
    if (selected.length >= 3 || selected.includes(id)) return;
    const next = [...selected, id];
    setSelected(next);
    setParams({ ids: next.join(',') });
    setPicker(false);
  }
  function removeStudent(id) {
    const next = selected.filter(x => x !== id);
    setSelected(next);
    setParams(next.length ? { ids: next.join(',') } : {});
  }

  const summary = useMemo(() => {
    if (summaries.length < 2) return null;
    const ranked = [...summaries].sort((a, b) => b.priority - a.priority);
    const top = ranked[0];
    return `${top.student.name} should receive the highest priority — risk is ${top.velocity > 0 ? 'rising' : 'stable'} at ${top.prediction.risk_probability}% with ${top.openAlerts.length} open alert${top.openAlerts.length !== 1 ? 's' : ''}, ahead of ${ranked.slice(1).map(r => r.student.name).join(' and ')}.`;
  }, [summaries]);

  const rows = [
    { label: 'Risk', get: (s) => `${s.prediction.risk_probability}%` },
    { label: 'Risk Level', get: (s) => <RiskBadge level={s.prediction.risk_level} size="sm" /> },
    { label: 'Attendance', get: (s) => `${latestFor(ATTENDANCE_RECORDS, s.student.id)?.attendance_percent}%` },
    { label: 'Assignments', get: (s) => `${Math.round(latestFor(ACADEMIC_RECORDS, s.student.id)?.assignment_completion)}%` },
    { label: 'LMS Activity', get: (s) => `${latestFor(ACADEMIC_RECORDS, s.student.id)?.lms_activity}%` },
    { label: 'Risk Trend', get: (s) => <span className="font-mono">{trendArrows(s.velocity)}</span> },
    { label: 'Priority Score', get: (s) => s.priority },
  ];

  return (
    <div>
      <PageHeader eyebrow="Screen 10" title="Student Comparison Mode" subtitle="Compare up to three students side-by-side across risk and underlying signals." />

      <SectionCard className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {summaries.map((s) => (
            <div key={s.student.id} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full panel-alt">
              <StudentAvatar name={s.student.name} size={24} />
              <span className="text-sm text-slate-200">{s.student.name}</span>
              <button onClick={() => removeStudent(s.student.id)} className="text-slate-500 hover:text-rose-400"><X size={13} /></button>
            </div>
          ))}
          {selected.length < 3 && (
            <div className="relative">
              <button onClick={() => setPicker(p => !p)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full chip text-slate-300">
                <Plus size={14} /> Add student
              </button>
              {picker && (
                <div className="absolute top-full mt-2 left-0 panel-alt shadow-xl w-64 max-h-64 overflow-y-auto z-20">
                  {STUDENTS.filter(s => !selected.includes(s.id)).map((s) => (
                    <button key={s.id} onClick={() => addStudent(s.id)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left">
                      <StudentAvatar name={s.name} size={24} />
                      <span className="text-sm text-slate-200 truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {summaries.length < 2 ? (
        <SectionCard><EmptyState title="Select at least two students" description="Add students above, or select them from the Priority Queue with the checkbox column." /></SectionCard>
      ) : (
        <>
          <SectionCard className="!p-0 overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hairline">
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium">Metric</th>
                    {summaries.map((s) => (
                      <th key={s.student.id} className="text-left px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StudentAvatar name={s.student.name} size={24} />
                          <span className="text-slate-200 font-medium">{s.student.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b hairline last:border-0">
                      <td className="px-4 py-3 text-slate-400 text-xs uppercase tracking-wide">{row.label}</td>
                      {summaries.map((s) => (
                        <td key={s.student.id} className="px-4 py-3 font-mono text-slate-200">{row.get(s)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Pulse AI Summary">
            <div className="flex items-start gap-2.5">
              <Sparkles size={15} className="text-teal-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-300">{summary}</p>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
