import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Cell } from 'recharts';
import { Download, ArrowRight } from 'lucide-react';
import { fetchSummaries, summarizeOutcomes, isOverdueIntervention, RISK_META } from '@/services/data';
import { api } from '@/services/api';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { OUTCOME_META } from '@/lib/riskUtils';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import RiskTrendChart from '@/components/charts/RiskTrendChart';

const AXIS = { fill: '#a98f95', fontSize: 11, fontFamily: 'IBM Plex Mono' };

function groupCount(items, keyFn) {
  if (!Array.isArray(items)) return [];
  const map = {};
  items.forEach((i) => { const k = keyFn(i); map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function downloadCsv(filename, rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper: format date string split
  const formatDate = (iso) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ---------- Derived real data (always called before early returns) ----------
  const riskDist = useMemo(() =>
    groupCount(Array.isArray(summaries) ? summaries : [], (s) => s?.prediction?.risk_level || 'LOW'),
  [], [summaries]);

  const deptDist = useMemo(() =>
    groupCount(Array.isArray(summaries) ? summaries : [], (s) => s?.student?.department || 'Unknown'),
  [], [summaries]);

  const semDist = useMemo(() =>
    groupCount(Array.isArray(summaries) ? summaries : [], (s) => `Sem ${s?.student?.semester || '?'}`).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  [], [summaries]);

  const alertDist = useMemo(() => {
    if (!Array.isArray(alerts) || !alerts.length) return [];
    return groupCount(alerts, (a) => (a?.alertType || '').replace(/_/g, ' '));
  }, [alerts]);

  const ivDist = useMemo(() => {
    const counts = {};
    (Array.isArray(summaries) ? summaries : []).forEach((s) => {
      (Array.isArray(s?.allInterventions) ? s.allInterventions : []).forEach((iv) => {
        const key = iv?.intervention_type || 'Other';
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [summaries]);

  const outcomeDist = useMemo(() => {
    const evaluations = summarizeOutcomes(summaries);
    const map = {};
    (Array.isArray(evaluations) ? evaluations : []).forEach((e) => {
      const cls = e?.evaluation?.classification;
      if (!cls) return;
      if (!map[cls]) map[cls] = 0;
      map[cls] += 1;
    });
    return Object.entries(map).map(([name, value]) => ({
      name: OUTCOME_META[name]?.label || name,
      value,
    }));
  }, [summaries]);

  const improvementTrend = useMemo(() => {
    const evaluations = [...summarizeOutcomes(summaries)].sort(
      (a, b) => new Date(b?.evaluation?.evaluatedAt) - new Date(a?.evaluation?.evaluatedAt),
    );
    let running = 0;
    return (Array.isArray(evaluations) ? evaluations : []).map((o) => {
      running +=
        o?.evaluation?.classification === 'IMPROVED'
          ? 1
          : o?.evaluation?.classification === 'INEFFECTIVE'
            ? -0.5
            : 0.25;
      return {
        period: formatDate(o?.evaluation?.evaluatedAt)?.split(' ')?.slice(0, 2).join(' ') || '--',
        improvement: Math.round(running * 10) / 10,
      };
    });
  }, [summaries]);

  // Follow-up / overdue students
  const followUpStudents = useMemo(() => {
    const dueIds = new Set(
      (Array.isArray(summaries) ? summaries : []).flatMap((s) =>
        (Array.isArray(s?.allInterventions) ? s.allInterventions : []).filter((iv) => isOverdueIntervention(iv)),
      ).map((iv) => iv?.studentId),
    );
    return (Array.isArray(summaries) ? summaries : [])
      .filter((s) => dueIds.has(s?.student?.id))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [summaries]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // 1. Load all student summaries (cache-aware, shared across pages)
        const s = await fetchSummaries();
        setSummaries(s || []);

        // 2. Load global alerts
        const aRes = await api.listAlerts({ page: 1, limit: 200 });
        const rawAlerts = aRes?.data?.alerts || [];
        setAlerts(rawAlerts.map((a) => {
          const severity = a.severity || a.priority || 'MEDIUM';
          return {
            id: a.id,
            studentId: a.studentId ?? a.student_id,
            studentName: a.studentName ?? a.student_name,
            alertType: a.alertType ?? a.alert_type,
            severity,
            title: a.message || `${severity} risk alert`,
            status: a.status,
            createdAt: a.createdAt ?? a.created_at,
          };
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard><Skeleton className="h-32" /></SectionCard>
        <SectionCard><Skeleton className="h-32" /></SectionCard>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Could not load reports" description={error} />;
  }

  if (!summaries || summaries.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="Screen 14"
          title="Reports & Analytics"
          subtitle="Institutional patterns across risk, departments, alerts and intervention outcomes."
        />
        <EmptyState
          icon={Download}
          title="No student data yet"
          description="Run predictions first so Pulse can generate reports."
        />
      </div>
    );
  }

  // ---------- CSV export from real loaded data ----------
  function exportSummary() {
    const rows = (Array.isArray(summaries) ? summaries : []).map((s) => ({
      student: s.student?.name,
      enrollment_number: s.student?.enrollment_number,
      department: s.student?.department,
      semester: s.student?.semester,
      risk_probability: s.prediction?.risk_probability,
      risk_level: s.prediction?.risk_level,
      deterioration_velocity: s.velocity,
      priority_score: s.priority,
      open_alerts: (Array.isArray(s.openAlerts) ? s.openAlerts : []).length || 0,
      active_interventions: (Array.isArray(s.activeInterventions) ? s.activeInterventions : []).length || 0,
    }));
    downloadCsv('arambhx-student-risk-summary.csv', rows);
  }

  // ---------- Recharts color mapping using RISK_META ----------
  const RISK_COLORS = {
    LOW: RISK_META.LOW?.color || '#3A8F6A',
    MEDIUM: RISK_META.MEDIUM?.color || '#D9922B',
    HIGH: RISK_META.HIGH?.color || '#C84C4C',
    DEFAULT: '#6B7280',
  };

  return (
    <div>
      <PageHeader
        eyebrow="Screen 14"
        title="Reports & Analytics"
        subtitle="Institutional patterns across risk, departments, alerts and intervention outcomes."
        actions={
          <button onClick={exportSummary} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-slate-200">
            <Download size={13} /> Export student risk summary (CSV)
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Risk Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart
              data={riskDist.length > 0 ? riskDist : [{ name: 'No data', value: 0 }]}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              isAnimationActive
              animationDuration={900}
            >
              {riskDist.map((d) => (
                <Cell key={d.name} fill={RISK_COLORS[d.name] || RISK_COLORS.DEFAULT} />
              ))}
            </PieChart>
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid #e6d3d6',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {riskDist.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: RISK_COLORS[d.name] || RISK_COLORS.DEFAULT }}
                />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Risk Trends Over Time" subtitle="Institution-wide average risk">
          <RiskTrendChart />
        </SectionCard>

        <SectionCard title="Department-wise Risk">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptDist.length > 0 ? deptDist : [{ name: 'No data', value: 0 }]} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="#f3e7e4" horizontal={false} />
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#c98f9f" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Semester-wise Risk">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={semDist.length > 0 ? semDist : [{ name: 'No data', value: 0 }]} margin={{ left: -20 }}>
              <CartesianGrid stroke="#f3e7e4" vertical={false} />
              <XAxis dataKey="name" tick={AXIS} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#7a5963" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Alert Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={alertDist.length > 0 ? alertDist : [{ name: 'No alerts', value: 0 }]} margin={{ left: -20 }}>
              <CartesianGrid stroke="#f3e7e4" vertical={false} />
              <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#eaa73f" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Intervention Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ivDist.length > 0 ? ivDist : [{ name: 'No interventions', value: 0 }]} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="#f3e7e4" horizontal={false} />
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#7a5963" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Intervention Outcomes" subtitle={`${followUpStudents.length} students currently in an active case`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart
              data={outcomeDist.length > 0 ? outcomeDist : [{ name: 'No outcomes', value: 0 }]}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              isAnimationActive
              animationDuration={900}
            >
{outcomeDist.map((d, _i) => (
                  <Cell key={d.name} fill={OUTCOME_META[d.name]?.color || '#9fe066'} />
                ))}
            </PieChart>
            <Tooltip
              contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }}
            />
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {outcomeDist.map((d, _i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: OUTCOME_META[d.name]?.color || '#9fe066' }}
                />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Improvement Trends" subtitle="Cumulative outcome momentum as interventions are evaluated">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={improvementTrend.length > 0 ? improvementTrend : [{ period: '--', improvement: 0 }]} margin={{ left: -20 }}>
              <CartesianGrid stroke="#f3e7e4" vertical={false} />
              <XAxis dataKey="period" tick={AXIS} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="improvement" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900}>
                {improvementTrend.map((d, i) => (
                  <Cell key={i} fill={d.improvement >= 0 ? '#9fe066' : '#ef6355'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Students Requiring Follow-up" subtitle={`${followUpStudents.length} students with an overdue follow-up date`} className="lg:col-span-2">
          {followUpStudents.length === 0 ? (
            <p className="text-sm text-slate-500">No students currently have an overdue follow-up.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {followUpStudents.map((s) => (
                <button
                  key={s.student.id}
                  onClick={() => navigate(`/students/${s.student.id}`)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left"
                >
                  <StudentAvatar name={s.student.name} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800 truncate">{s.student.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{s.prediction?.risk_probability}% risk · priority {s.priority}</div>
                  </div>
                  <ArrowRight size={13} className="text-slate-600" />
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}