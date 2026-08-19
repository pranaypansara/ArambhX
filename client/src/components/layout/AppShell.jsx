import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PulseAIPanel from '@/components/ai/PulseAIPanel';
import { Sparkles } from 'lucide-react';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-void)' }}>
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 lg:px-6 py-6 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 z-[70] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #7a5963, #c98f9f)' }}
          aria-label="Open Pulse AI"
        >
          <Sparkles size={22} className="text-[#fbf3f0]" />
        </button>
      )}

      <PulseAIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
