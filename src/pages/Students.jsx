import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ChevronRight, Scale, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { ALL_STUDENT_SUMMARIES, USERS, factorsForPrediction } from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import RiskBadge from '@/components/ui/RiskBadge';
import TrendIndicator from '@/components/ui/TrendIndicator';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/riskUtils';

const SORTS = {
  priority: { label: 'Highest priority', fn: (a, b) => b.priority - a.priority },
  risk: { label: 'Highest risk', fn: (a, b) => b.prediction.risk_probability - a.prediction.risk_probability },
  velocity: { label: 'Fastest deterioration', fn: (a, b) => b.velocity - a.velocity },
  alerts: { label: 'Most recent alert', fn: (a, b) => (b.openAlerts[0]?.created_at || '').localeCompare(a.openAlerts[0]?.created_at || '') },
  overdue: {
    label: 'Intervention overdue',
    fn: (a, b) => {
      const overdue = (s) => s.activeInterventions.some(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date()) ? 1 : 0;
      return overdue(b) - overdue(a) || b.priority - a.priority;
    },
  },
};

const DEPARTMENTS = [...new Set(ALL_STUDENT_SUMMARIES.map(s => s.student.department))];
const SEMESTERS = [...new Set(ALL_STUDENT_SUMMARIES.map(s => s.student.semester))].sort((a, b) => a - b);
const ALERT_TYPES = ['EARLY_WARNING', 'HIGH_RISK', 'CRITICAL', 'MULTI_FACTOR'];
const INTERVENTION_STATUSES = ['RECOMMENDED', 'ASSIGNED', 'STARTED', 'MONITORING', 'COMPLETED', 'ESCALATED', 'CLOSED'];

function actionLabel(s) {
  if (s.openAlerts.some(a => a.status === 'OPEN')) return 'Investigate';
  if (s.activeInterventions.some(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date())) return 'Follow Up';
  if (s.activeInterventions.length === 0 && s.prediction.risk_level !== 'STABLE') return 'Assign';
  return 'Review';
}

export default function Students() {
  const navigate = useNavigate();
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [semFilter, setSemFilter] = useState('ALL');
  const [trendFilter, setTrendFilter] = useState('ALL');
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [ivStatusFilter, setIvStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('priority');
  const [query, setQuery] = useState('');
  const [compareIds, setCompareIds] = useState([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const rows = useMemo(() => {
    let r = [...ALL_STUDENT_SUMMARIES];
    if (riskFilter !== 'ALL') r = r.filter(s => s.prediction.risk_level === riskFilter);
    if (deptFilter !== 'ALL') r = r.filter(s => s.student.department === deptFilter);
    if (semFilter !== 'ALL') r = r.filter(s => String(s.student.semester) === semFilter);
    if (trendFilter !== 'ALL') r = r.filter(s => trendFilter === 'UP' ? s.velocity > 1 : trendFilter === 'DOWN' ? s.velocity < -1 : Math.abs(s.velocity) <= 1);
    if (alertFilter !== 'ALL') r = r.filter(s => s.openAlerts.some(a => a.alert_type === alertFilter));
    if (ivStatusFilter !== 'ALL') r = r.filter(s => s.activeInterventions.some(iv => iv.status === ivStatusFilter) || (ivStatusFilter === 'NONE' && s.activeInterventions.length === 0));
    if (query) r = r.filter(s => s.student.name.toLowerCase().includes(query.toLowerCase()) || s.student.enrollment_number.toLowerCase().includes(query.toLowerCase()));
    return [...r].sort(SORTS[sortKey].fn);
  }, [riskFilter, deptFilter, semFilter, trendFilter, alertFilter, ivStatusFilter, sortKey, query]);

  function toggleCompare(id) {
    setCompareIds((c) => c.includes(id) ? c.filter(x => x !== id) : c.length < 3 ? [...c, id] : c);
  }

  function resetFilters() {
    setRiskFilter('ALL'); setDeptFilter('ALL'); setSemFilter('ALL');
    setTrendFilter('ALL'); setAlertFilter('ALL'); setIvStatusFilter('ALL'); setQuery('');
  }

  return (
    <div>
      <PageHeader
        eyebrow="Screen 02"
        title="Student Priority Queue"
        subtitle="Ranked by urgency — not just risk. A fast-deteriorating student can outrank a higher but stable one."
        actions={compareIds.length >= 2 && (
          <button
            onClick={() => navigate(`/comparison?ids=${compareIds.join(',')}`)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: '#c98f9f', color: '#fff' }}
          >
            <Scale size={13} /> Compare {compareIds.length} students
          </button>
        )}
      />

      <SectionCard className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students…"
              className="bg-[#ffffff] border hairline rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-teal-400 outline-none w-48"
            />
          </div>

          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
            <option value="ALL">All risk levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="DETERIORATING">Deteriorating</option>
            <option value="WATCH">Watch</option>
            <option value="STABLE">Stable</option>
          </select>

          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
            <option value="ALL">All departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <button
            onClick={() => setShowMoreFilters(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${showMoreFilters ? 'border-teal-400 text-teal-300' : 'hairline text-slate-400'}`}
          >
            <SlidersHorizontal size={13} /> More filters
          </button>

          <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-500">
            <ArrowUpDown size={13} />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {showMoreFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t hairline">
            <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select value={trendFilter} onChange={(e) => setTrendFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All risk trends</option>
              <option value="UP">Rising</option>
              <option value="DOWN">Falling</option>
              <option value="FLAT">Flat</option>
            </select>
            <select value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All alert types</option>
              {ALERT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <select value={ivStatusFilter} onChange={(e) => setIvStatusFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All intervention statuses</option>
              <option value="NONE">No active intervention</option>
              {INTERVENTION_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-300 ml-auto">Reset filters</button>
          </div>
        )}
      </SectionCard>

      <SectionCard className="!p-0 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No students match these filters" description="Try widening the risk level, department, or other filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b hairline">
                  <th className="px-4 py-3 font-medium w-8"></th>
                  <th className="px-2 py-3 font-medium">Student</th>
                  <th className="px-3 py-3 font-medium">Current Risk</th>
                  <th className="px-3 py-3 font-medium">Trend</th>
                  <th className="px-3 py-3 font-medium">Priority</th>
                  <th className="px-3 py-3 font-medium">Main Risk Factor</th>
                  <th className="px-3 py-3 font-medium">Alert</th>
                  <th className="px-3 py-3 font-medium">Intervention</th>
                  <th className="px-3 py-3 font-medium">Assigned Staff</th>
                  <th className="px-3 py-3 font-medium">Last Updated</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const topFactor = factorsForPrediction(s.prediction.id)[0];
                  const alert = s.openAlerts[0];
                  const iv = s.activeInterventions[0];
                  const staff = iv ? USERS.find(u => u.id === iv.assigned_to) : null;
                  return (
                    <tr
                      key={s.student.id}
                      className="border-b hairline last:border-0 hover:bg-white/[0.02] cursor-pointer group"
                      onClick={() => navigate(`/students/${s.student.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox" checked={compareIds.includes(s.student.id)}
                          onChange={() => toggleCompare(s.student.id)}
                          className="accent-teal-500"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar name={s.student.name} size={30} />
                          <div className="min-w-0">
                            <div className="text-slate-200 font-medium truncate">{s.student.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{s.student.department} · Sem {s.student.semester}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-100">{s.prediction.risk_probability}%</span>
                          <RiskBadge level={s.prediction.risk_level} size="sm" />
                        </div>
                      </td>
                      <td className="px-3 py-3"><TrendIndicator value={s.velocity} /></td>
                      <td className="px-3 py-3 font-mono text-slate-300">{s.priority}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{topFactor?.feature_name || '—'}</td>
                      <td className="px-3 py-3 text-xs">
                        {alert ? <span className="text-amber-300">{alert.alert_type.replace('_', ' ')}</span> : <span className="text-slate-600">None</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">{iv ? iv.intervention_label : '—'}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">{staff ? staff.name : '—'}</td>
                      <td className="px-3 py-3 text-xs text-slate-500 font-mono">{formatDate(s.prediction.predicted_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/students/${s.student.id}`)}
                          className="flex items-center gap-1 text-xs chip px-2.5 py-1.5 rounded-full text-teal-300"
                        >
                          {actionLabel(s)} <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
