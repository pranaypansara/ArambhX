import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Download, ArrowRight } from 'lucide-react';
import {
  ALL_STUDENT_SUMMARIES, ALERTS, INTERVENTIONS, INTERVENTION_OUTCOMES, STUDENTS,
} from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import RiskTrendChart from '@/components/charts/RiskTrendChart';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { OUTCOME_META, formatDate } from '@/lib/riskUtils';

const AXIS = { fill: '#a98f95', fontSize: 11, fontFamily: 'IBM Plex Mono' };

function groupCount(items, keyFn) {
  const map = {};
  items.forEach((i) => { const k = keyFn(i); map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(',')),
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
  const riskDist = useMemo(() => groupCount(ALL_STUDENT_SUMMARIES, s => s.prediction.risk_level), []);
  const deptDist = useMemo(() => groupCount(ALL_STUDENT_SUMMARIES, s => s.student.department), []);
  const semDist = useMemo(() => groupCount(ALL_STUDENT_SUMMARIES, s => `Sem ${s.student.semester}`).sort((a, b) => a.name.localeCompare(b.name)), []);
  const alertDist = useMemo(() => groupCount(ALERTS, a => a.alert_type.replace('_', ' ')), []);
  const ivDist = useMemo(() => groupCount(INTERVENTIONS, iv => iv.intervention_label), []);
  const outcomeDist = useMemo(() => groupCount(INTERVENTION_OUTCOMES, o => OUTCOME_META[o.outcome_classification].label), []);
  const followUp = STUDENTS.length - ALL_STUDENT_SUMMARIES.filter(s => s.activeInterventions.length === 0).length;

  const improvementTrend = useMemo(() => {
    const sorted = [...INTERVENTION_OUTCOMES].sort((a, b) => new Date(a.evaluated_at) - new Date(b.evaluated_at));
    let running = 0;
    return sorted.map((o) => {
      running += o.outcome_classification === 'IMPROVED' ? 1 : o.outcome_classification === 'INEFFECTIVE' ? -0.5 : 0.25;
      return { period: formatDate(o.evaluated_at).split(' ').slice(0, 2).join(' '), improvement: Math.round(running * 10) / 10 };
    });
  }, []);

  const followUpStudents = useMemo(() => {
    const dueIds = new Set(
      INTERVENTIONS.filter(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date()).map(iv => iv.student_id)
    );
    return ALL_STUDENT_SUMMARIES.filter(s => dueIds.has(s.student.id)).sort((a, b) => b.priority - a.priority);
  }, []);

  function exportSummary() {
    downloadCsv('arambhx-student-risk-summary.csv', ALL_STUDENT_SUMMARIES.map(s => ({
      student: s.student.name,
      enrollment_number: s.student.enrollment_number,
      department: s.student.department,
      semester: s.student.semester,
      risk_probability: s.prediction.risk_probability,
      risk_level: s.prediction.risk_level,
      deterioration_velocity: s.velocity,
      priority_score: s.priority,
      open_alerts: s.openAlerts.length,
      active_interventions: s.activeInterventions.length,
    })));
  }

  const RISK_COLORS = { CRITICAL: '#ef6355', DETERIORATING: '#f2884f', WATCH: '#eaa73f', STABLE: '#9fe066' };
  const OUTCOME_COLORS = ['#9fe066', '#eaa73f', '#ef6355'];

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
            <PieChart>
              <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} isAnimationActive animationDuration={900}>
                {riskDist.map((d) => <Cell key={d.name} fill={RISK_COLORS[d.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {riskDist.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full" style={{ background: RISK_COLORS[d.name] }} />{d.name} ({d.value})
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Risk Trends Over Time" subtitle="Institution-wide average risk">
          <RiskTrendChart />
        </SectionCard>

        <SectionCard title="Department-wise Risk">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptDist} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="#f3e7e4" horizontal={false} />
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#c98f9f" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Semester-wise Risk">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={semDist} margin={{ left: -20 }}>
              <CartesianGrid stroke="#f3e7e4" vertical={false} />
              <XAxis dataKey="name" tick={AXIS} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#7a5963" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Alert Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={alertDist} margin={{ left: -20 }}>
              <CartesianGrid stroke="#f3e7e4" vertical={false} />
              <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#eaa73f" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Intervention Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ivDist} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="#f3e7e4" horizontal={false} />
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#7a5963" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Intervention Outcomes" subtitle={`${followUp} students currently in an active case`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={outcomeDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} isAnimationActive animationDuration={900}>
                {outcomeDist.map((d, i) => <Cell key={d.name} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {outcomeDist.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full" style={{ background: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }} />{d.name} ({d.value})
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Improvement Trends" subtitle="Cumulative outcome momentum as interventions are evaluated">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={improvementTrend} margin={{ left: -20 }}>
              <CartesianGrid stroke="#f3e7e4" vertical={false} />
              <XAxis dataKey="period" tick={AXIS} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #e6d3d6', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="improvement" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900}>
                {improvementTrend.map((d, i) => <Cell key={i} fill={d.improvement >= 0 ? '#9fe066' : '#ef6355'} />)}
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
                    <div className="text-sm text-slate-200 truncate">{s.student.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{s.prediction.risk_probability}% risk · priority {s.priority}</div>
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
