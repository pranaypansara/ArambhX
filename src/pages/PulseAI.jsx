import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import ProactiveInsights from '@/components/ai/ProactiveInsights';

export default function PulseAI() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader eyebrow="Screen 12 · 13" title="Pulse AI" subtitle="Natural-language decision support over your dashboard data, plus what it's noticed on its own." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Proactive Insights" subtitle="Things Pulse noticed without being asked">
          <ProactiveInsights onNavigate={() => navigate('/students')} />
        </SectionCard>

        <SectionCard title="Ask Pulse AI" subtitle="Use the assistant in the bottom-right corner from anywhere in the app">
          <div className="flex flex-col items-center justify-center text-center py-10 px-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #7a5963, #c98f9f)' }}>
              <Sparkles size={20} className="text-[#fbf3f0]" />
            </div>
            <p className="text-sm text-slate-300 max-w-sm">
              Pulse AI can explain a risk change, identify priority students, recommend interventions, compare students,
              or summarize alerts — try the chat panel to ask a question in plain language.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
