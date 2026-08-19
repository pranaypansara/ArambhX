import { PageHeader, SectionCard } from '@/components/ui/Page';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABELS } from '@/services/data';

function Toggle({ label, defaultOn = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b hairline last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="accent-teal-500 w-4 h-4" />
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const fields = {
    Name: user?.name,
    Role: user?.role ? (ROLE_LABELS[user.role] || user.role) : '—',
    'Email': user?.email,
    'Student ID': user?.studentId ?? '—',
  };
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" subtitle="Account, role, and notification preferences." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Profile">
          <div className="space-y-3 text-sm">
            {Object.entries(fields).map(([k, v]) => (
              <div key={k}>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{k}</div>
                <div className={`text-slate-800 ${k === 'Email' ? 'font-mono text-xs' : ''}`}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Notification preferences">
          <Toggle label="Critical risk alerts" defaultOn />
          <Toggle label="Multi-factor alerts" defaultOn />
          <Toggle label="Follow-up reminders" defaultOn />
          <Toggle label="Outcome updates" defaultOn />
          <Toggle label="Weekly digest email" />
          <button
            onClick={() => toast?.push('Preferences saved.', 'success')}
            className="mt-4 text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: '#7a5963', color: '#fbf3f0' }}
          >
            Save changes
          </button>
        </SectionCard>
      </div>
    </div>
  );
}