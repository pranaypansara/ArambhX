import { PageHeader, SectionCard } from '@/components/ui/Page';
import { CURRENT_USER } from '@/data/mockData';
import { useToast } from '@/components/ui/Toast';

function Toggle({ label, defaultOn = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b hairline last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="accent-teal-500 w-4 h-4" />
    </div>
  );
}

export default function Settings() {
  const toast = useToast();
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" subtitle="Account, roles, and notification preferences." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Profile">
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Name</div>
              <div className="text-slate-200">{CURRENT_USER.name}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Role</div>
              <div className="text-slate-200">{CURRENT_USER.role}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Department</div>
              <div className="text-slate-200">{CURRENT_USER.department}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Email</div>
              <div className="text-slate-200 font-mono text-xs">{CURRENT_USER.email}</div>
            </div>
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
