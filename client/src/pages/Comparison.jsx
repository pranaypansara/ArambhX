import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, X, Plus } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import StudentAvatar from '@/components/ui/StudentAvatar';
import RiskBadge from '@/components/ui/RiskBadge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useAsyncData, fetchSummaries } from '@/services/data';
import { api } from '@/services/api';

const MAX = 3;

function trendArrows(velocity) {
  if (velocity > 5) return '↑↑';
  if (velocity > 1) return '↑';
  if (velocity < -1) return '↓';
  return '→';
}

function latestValue(records, key) {
  if (!Array.isArray(records) || records.length === 0) return null;
  const last = records[records.length - 1];
  return last[key] ?? null;
}

export default function Comparison() {
  const [params, setParams] = useSearchParams();
  const idsFromUrl = (params.get('ids') || '').split(',').filter(Boolean);
  const [selected, setSelected] = useState(idsFromUrl.length ? idsFromUrl : []);
  const [picker, setPicker] = useState(false);

  const { data: summaries, loading, error, reload } = useAsyncData(() => fetchSummaries(), []);
  const all = summaries || [];

  const rows = useMemo(() => {
    if (all.length === 0) return [];
    return selected
      .map((id) => all.find((s) => String(s.student?.id) === String(id)))
      .filter(Boolean);
  }, [all, selected]);

  const [signals, setSignals] = useState({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const next = {};
      const targets = rows.filter((s) => !signals[s.student.id]);
      await Promise.all(targets.map(async (s) => {
        const [attRes, acRes] = await Promise.allSettled([
          api.getAttendance(s.student.id),
          api.getAcademicRecords(s.student.id),
        ]);
        const att = attRes.status === 'fulfilled' ? attRes.value?.data?.attendanceRecords : [];
        const ac = acRes.status === 'fulfilled' ? acRes.value?.data?.academicRecords : [];
        next[s.student.id] = {
          attendance: latestValue(att, 'attendancePercentage') ?? latestValue(att, 'attendance_percent') ?? null,
          assignments: ac?.academicRecords?.length ? null : null,
          assignment: latestValue(ac, 'assignmentCompletionRate') ?? null,
          lms: latestValue(ac, 'lmsActivityScore') ?? null,
        };
      }));
      if (alive) setSignals((p) => ({ ...p, ...next }));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function addStudent(id) {
    if (selected.length >= MAX || selected.includes(id)) return;
    const next = [...selected, String(id)];
    setSelected(next);
    setParams({ ids: next.join(',') });
    setPicker(false);
  }
  function removeStudent(id) {
    const next = selected.filter((x) => x !== id);
    setSelected(next);
    setParams(next.length ? { ids: next.join(',') } : {});
  }

  const summary = useMemo(() => {
    if (rows.length < 2) return null;
    const ranked = [...rows].sort((a, b) => b.priority - a.priority);
    const top = ranked[0];
    const dir = top.velocity > 1 ? 'rising' : top.velocity < -1 ? 'falling' : 'stable';
    return `${top.student?.name} should receive the highest priority — risk is ${dir} at ${top.prediction?.probability ?? '—'}% with ${top.openAlerts?.length || 0} open alert(s), ahead of ${ranked.slice(1).map((r) => r.student?.name).join(' and ')}.`;
  }, [rows]);

  const tableRows = [
    { label: 'Risk', get: (s) => `${s.prediction?.probability ?? '—'}%` },
    { label: 'Risk Level', get: (s) => s.prediction?.risk_level ? <RiskBadge level={s.prediction.risk_level} size="sm" /> : <span className="text-slate-500">—</span> },
    { label: 'Attendance', get: (s) => signals[s.student.id]?.attendance != null ? `${Math.round(signals[s.student.id].attendance)}%` : '—' },
    { label: 'Assignments', get: (s) => signals[s.student.id]?.assignment != null ? `${Math.round(signals[s.student.id].assignment)}%` : '—' },
    { label: 'LMS Activity', get: (s) => signals[s.student.id]?.lms != null ? `${Math.round(signals[s.student.id].lms)}%` : '—' },
    { label: 'Risk Trend', get: (s) => <span className="font-mono">{trendArrows(s.velocity)}</span> },
    { label: 'Priority Score', get: (s) => Math.round(s.priority || 0) },
  ];

  return (
    <div>
      <PageHeader eyebrow="Screen 10" title="Student Comparison Mode" subtitle="Compare up to three students side-by-side across risk and underlying signals." />

      <SectionCard className="mb-5">
        {loading ? <Skeleton className="h-10" /> : error ? <ErrorState title="Could not load students" description={error.message} onRetry={reload} /> : (
          <div className="flex flex-wrap items-center gap-3">
            {rows.map((s) => (
              <div key={s.student.id} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full panel-alt">
                <StudentAvatar name={s.student?.name} size={24} />
                <span className="text-sm text-slate-800">{s.student?.name}</span>
                <button onClick={() => removeStudent(s.student.id)} className="text-slate-500 hover:text-rose-500"><X size={13} /></button>
              </div>
            ))}
            {selected.length < MAX && (
              <div className="relative">
                <button onClick={() => setPicker((p) => !p)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full chip text-slate-700">
                  <Plus size={14} /> Add student
                </button>
                {picker && (
                  <div className="absolute top-full mt-2 left-0 panel-alt shadow-xl w-64 max-h-64 overflow-y-auto z-20">
                    {all.filter((s) => !selected.includes(String(s.student.id))).map((s) => (
                      <button key={s.student.id} onClick={() => addStudent(s.student.id)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left">
                        <StudentAvatar name={s.student?.name} size={24} />
                        <span className="text-sm text-slate-800 truncate">{s.student?.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {rows.length < 2 ? (
        <SectionCard><EmptyState title="Select at least two students" description="Add students above, or select them from the Priority Queue with the checkbox column." /></SectionCard>
      ) : (
        <>
          <SectionCard className="!p-0 overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hairline">
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium">Metric</th>
                    {rows.map((s) => (
                      <th key={s.student.id} className="text-left px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StudentAvatar name={s.student?.name} size={24} />
                          <span className="text-slate-800 font-medium">{s.student?.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.label} className="border-b hairline last:border-0">
                      <td className="px-4 py-3 text-slate-500 text-xs uppercase tracking-wide">{row.label}</td>
                      {rows.map((s) => (
                        <td key={s.student.id} className="px-4 py-3 font-mono text-slate-800">{row.get(s)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Pulse AI Summary">
            <div className="flex items-start gap-2.5">
              <Sparkles size={15} className="text-teal-600 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700">{summary}</p>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}