import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ChevronRight, Scale, Search as SearchIcon, SlidersHorizontal, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import RiskBadge from '@/components/ui/RiskBadge';
import TrendIndicator from '@/components/ui/TrendIndicator';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Modal } from '@/components/ui/Overlay';
import { useAsyncData, fetchSummaries, ALERT_TYPES, INTERVENTION_STATUSES, clearSummaryCache } from '@/services/data';
import { isOpenAlert } from '@/services/data';
import { formatDate } from '@/lib/riskUtils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/services/api';

const RISK_OPTIONS = [
  { value: 'ALL', label: 'All risk levels' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const SORTS = {
  priority: { label: 'Highest priority', fn: (a, b) => b.priority - a.priority },
  risk: {
    label: 'Highest risk',
    fn: (a, b) => (b.prediction?.risk_probability ?? -1) - (a.prediction?.risk_probability ?? -1),
  },
  velocity: { label: 'Fastest deterioration', fn: (a, b) => b.velocity - a.velocity },
  alerts: {
    label: 'Most recent alert',
    fn: (a, b) => (b.openAlerts[0]?.created_at || '').localeCompare(a.openAlerts[0]?.created_at || ''),
  },
  overdue: {
    label: 'Intervention overdue',
    fn: (a, b) => {
      const overdue = (s) => s.activeInterventions.some(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date()) ? 1 : 0;
      return overdue(b) - overdue(a) || b.priority - a.priority;
    },
  },
};

function actionLabel(s) {
  if (s.openAlerts.some(isOpenAlert)) return 'Investigate';
  if (s.activeInterventions.some(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date())) return 'Follow Up';
  if (s.activeInterventions.length === 0 && s.prediction?.risk_level === 'HIGH') return 'Assign';
  return 'Review';
}

function SyncModal({ open, onClose, onSynced }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setLoading(false);
    setCommitting(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!file) {
      toast.show('Please select a file.', 'error');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.previewStudentSync(fd);
      setPreview(res.data);
    } catch (err) {
      toast.show(err.message || 'Preview failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    if (preview?.summary?.invalid > 0) {
      toast.show('Cannot commit with invalid rows. Fix the file and preview again.', 'error');
      return;
    }
    setCommitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.commitStudentSync(fd);
      toast.show(`Sync complete: ${res.data.summary.toCreate} created, ${res.data.summary.toUpdate} updated.`, 'success');
      clearSummaryCache();
      onSynced?.();
      handleClose();
    } catch (err) {
      const payload = err.payload?.data;
      if (payload?.rows) setPreview(payload);
      toast.show(err.payload?.message || err.message || 'Commit failed.', 'error');
    } finally {
      setCommitting(false);
    }
  };

  const summary = preview?.summary;
  const rows = preview?.rows || [];

  return (
    <Modal open={open} onClose={handleClose} title="Student Data Sync" width={860}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Upload CSV, XLS, or XLSX. Matching is by <span className="text-slate-200 font-mono">enrollment_number</span> — existing students are updated (only supplied fields), new ones are created. Seeded and imported students share the same table.</p>

        <div className="flex items-center gap-3">
          <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="flex-1 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-teal-500 file:text-white file:text-xs file:font-medium hover:file:bg-teal-600" />
          <button onClick={handlePreview} disabled={!file || loading} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-panel border hairline text-slate-200 hover:border-teal-400 disabled:opacity-40">
            <FileSpreadsheet size={14} /> {loading ? 'Previewing…' : 'Preview'}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 space-y-1 bg-white/[0.03] border hairline rounded-lg p-3">
          <div className="font-mono font-bold text-slate-300">Accepted columns (case-insensitive, normalized):</div>
          <div>enrollment_number: <span className="text-slate-400">student_id, studentId, enrollment_no, enrollment_number</span></div>
          <div>name: <span className="text-slate-400">name, first_name + last_name, firstName/lastName</span></div>
          <div>email: <span className="text-slate-400">email, email_address</span> | department: <span className="text-slate-400">dept</span> | semester: <span className="text-slate-400">sem</span></div>
        </div>

        {preview && summary && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="panel p-3"><div className="text-[11px] uppercase tracking-wide text-slate-500">To Create</div><div className="text-lg font-mono font-bold text-teal-300">{summary.toCreate}</div></div>
              <div className="panel p-3"><div className="text-[11px] uppercase tracking-wide text-slate-500">To Update</div><div className="text-lg font-mono font-bold text-amber-400">{summary.toUpdate}</div></div>
              <div className="panel p-3"><div className="text-[11px] uppercase tracking-wide text-slate-500">Unchanged</div><div className="text-lg font-mono font-bold text-slate-300">{summary.unchanged}</div></div>
              <div className="panel p-3"><div className="text-[11px] uppercase tracking-wide text-slate-500">Invalid</div><div className="text-lg font-mono font-bold text-rose-400">{summary.invalid}</div></div>
            </div>

            <div className="max-h-[36vh] overflow-auto border hairline rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-panel">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b hairline">
                    <th className="px-2 py-2">Row</th>
                    <th className="px-2 py-2">Enrollment</th>
                    <th className="px-2 py-2">Action</th>
                    <th className="px-2 py-2">Details / Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNumber} className={`border-b hairline last:border-0 ${r.action === 'invalid' ? 'bg-rose-500/5' : r.action === 'create' ? 'bg-teal-500/5' : r.action === 'update' ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-2 py-2 font-mono text-slate-400">{r.rowNumber}</td>
                      <td className="px-2 py-2 font-mono text-slate-200">{r.enrollmentNumber || '—'}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${r.action === 'create' ? 'bg-teal-500/15 text-teal-300 border-teal-500/20' : r.action === 'update' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : r.action === 'unchanged' ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-rose-500/15 text-rose-300 border-rose-500/20'}`}>
                          {r.action === 'invalid' ? <AlertCircle size={12} /> : r.action === 'unchanged' ? <CheckCircle2 size={12} /> : null}
                          {r.action}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-400 max-w-[360px]">
                        {r.errors.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-0.5 text-rose-300">
                            {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        ) : r.action === 'create' ? (
                          <span className="text-slate-400">Will create: {Object.entries(r.fields).map(([k, v]) => `${k}=${String(v)}`).join(', ')}</span>
                        ) : r.action === 'update' ? (
                          <span className="text-slate-400">Will update: {Object.entries(r.fields).filter(([k]) => k !== 'enrollmentNumber').map(([k, v]) => `${k}=${String(v)}`).join(', ') || '—'}</span>
                        ) : (
                          <span className="text-slate-500">No changes</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button onClick={handleClose} className="text-xs px-3 py-2 rounded-lg border hairline text-slate-300 hover:bg-white/5">Cancel</button>
              <button onClick={handleCommit} disabled={committing || summary.invalid > 0} className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40">
                <Upload size={14} /> {committing ? 'Committing…' : `Commit ${summary.toCreate + summary.toUpdate} changes`}
              </button>
            </div>
            {summary.invalid > 0 && <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertCircle size={12} /> Fix invalid rows before committing. The import is transactional — it will not commit with errors.</p>}
          </div>
        )}

        {!preview && (
          <p className="text-xs text-slate-500">Select a file and click Preview to validate before committing. The commit is transactional.</p>
        )}
      </div>
    </Modal>
  );
}

export default function Students() {
  const navigate = useNavigate();
  const { data: summaries, loading, error, reload } = useAsyncData(() => fetchSummaries(), []);
  const { role } = useAuth();
  const canSync = role === 'ADMIN' || role === 'FACULTY';

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
  const [syncOpen, setSyncOpen] = useState(false);

  const DEPARTMENTS = useMemo(() => ([...new Set((summaries || []).map(s => s.student.department))]), [summaries]);
  const SEMESTERS = useMemo(() => ([...new Set((summaries || []).map(s => s.student.semester))].sort((a, b) => a - b)), [summaries]);

  const rows = useMemo(() => {
    let r = summaries ? [...summaries] : [];
    if (riskFilter !== 'ALL') r = r.filter(s => s.prediction?.risk_level === riskFilter);
    if (deptFilter !== 'ALL') r = r.filter(s => s.student.department === deptFilter);
    if (semFilter !== 'ALL') r = r.filter(s => String(s.student.semester) === semFilter);
    if (trendFilter !== 'ALL') r = r.filter(s => trendFilter === 'UP' ? s.velocity > 1 : trendFilter === 'DOWN' ? s.velocity < -1 : Math.abs(s.velocity) <= 1);
    if (alertFilter !== 'ALL') r = r.filter(s => s.openAlerts.some(a => a.alert_type === alertFilter));
    if (ivStatusFilter !== 'ALL') r = r.filter(s => s.activeInterventions.some(iv => iv.status === ivStatusFilter) || (ivStatusFilter === 'NONE' && s.activeInterventions.length === 0));
    if (query) r = r.filter(s => s.student.name.toLowerCase().includes(query.toLowerCase()) || (s.student.enrollment_number || '').toLowerCase().includes(query.toLowerCase()));
    return [...r].sort(SORTS[sortKey].fn);
  }, [summaries, riskFilter, deptFilter, semFilter, trendFilter, alertFilter, ivStatusFilter, sortKey, query]);

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
        actions={(
          <div className="flex items-center gap-2">
            {canSync && (
              <button onClick={() => setSyncOpen(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600">
                <Upload size={13} /> Sync Data
              </button>
            )}
            {compareIds.length >= 2 && (
              <button
                onClick={() => navigate(`/comparison?ids=${compareIds.join(',')}`)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
                style={{ background: '#c98f9f', color: '#fff' }}
              >
                <Scale size={13} /> Compare {compareIds.length} students
              </button>
            )}
          </div>
        )}
      />

      <SectionCard className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students…"
              className="bg-panel border hairline rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-teal-400 outline-none w-48"
            />
          </div>

          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
            {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
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
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {showMoreFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t hairline">
            <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select value={trendFilter} onChange={(e) => setTrendFilter(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All risk trends</option>
              <option value="UP">Rising</option>
              <option value="DOWN">Falling</option>
              <option value="FLAT">Flat</option>
            </select>
            <select value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All alert types</option>
              {ALERT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <select value={ivStatusFilter} onChange={(e) => setIvStatusFilter(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
              <option value="ALL">All intervention statuses</option>
              <option value="NONE">No active intervention</option>
              {INTERVENTION_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-300 ml-auto">Reset filters</button>
          </div>
        )}
      </SectionCard>

      <SectionCard className="!p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState title="Could not load students" description={error.message} onRetry={() => reload({ force: true })} />
          </div>
        ) : rows.length === 0 ? (
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
                  <th className="px-3 py-3 font-medium">Top Signal</th>
                  <th className="px-3 py-3 font-medium">Alert</th>
                  <th className="px-3 py-3 font-medium">Intervention</th>
                  <th className="px-3 py-3 font-medium">Last Updated</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const topSignal = [...s.openAlerts].sort((a, b) => severityRank(b.priority) - severityRank(a.priority))[0];
                  const alert = s.openAlerts[0];
                  const iv = s.activeInterventions[0];
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
                            <div className="text-slate-700 font-medium truncate">{s.student.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{s.student.department} · Sem {s.student.semester}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {s.prediction ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-700">{s.prediction.risk_probability}%</span>
                            <RiskBadge level={s.prediction.risk_level} size="sm" />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Not analyzed</span>
                        )}
                      </td>
                      <td className="px-3 py-3"><TrendIndicator value={s.velocity} /></td>
                      <td className="px-3 py-3 font-mono text-slate-700">{s.priority}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">{topSignal ? topSignal.alert_type.replace('_', ' ') : '—'}</td>
                      <td className="px-3 py-3 text-xs">
                        {alert ? <span className="text-amber-600">{alert.alert_type.replace('_', ' ')}</span> : <span className="text-slate-400">None</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{iv ? iv.intervention_label : '—'}</td>
                      <td className="px-3 py-3 text-xs text-slate-500 font-mono">{s.prediction ? formatDate(s.prediction.predicted_at) : '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/students/${s.student.id}`)}
                          className="flex items-center gap-1 text-xs chip px-2.5 py-1.5 rounded-full text-teal-500"
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

      {canSync && <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} onSynced={() => { clearSummaryCache(); reload({ force: true }); }} />}
    </div>
  );
}

function severityRank(priority) {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[priority] || 0;
}
