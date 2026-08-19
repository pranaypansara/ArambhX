import { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { PROACTIVE_INSIGHTS } from '@/data/mockData';

const KIND_COLOR = {
  CRITICAL_ENTRY: '#ef6355',
  RAPID_DECLINE: '#f2884f',
  FOLLOW_UP_DUE: '#eaa73f',
  IMPROVED: '#9fe066',
  INEFFECTIVE: '#ef6355',
};

export default function ProactiveInsights({ onNavigate }) {
  const [openId, setOpenId] = useState(PROACTIVE_INSIGHTS[0]?.id);
  return (
    <div className="space-y-2">
      {PROACTIVE_INSIGHTS.map((insight) => {
        const isOpen = openId === insight.id;
        const color = KIND_COLOR[insight.kind];
        return (
          <div key={insight.id} className="panel overflow-hidden">
            <button
              onClick={() => setOpenId(isOpen ? null : insight.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-sm text-slate-200 flex-1">{insight.text}</span>
              <ChevronDown size={15} className={`text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-2.5 text-sm border-t hairline">
                <div className="pt-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Why?</div>
                  <p className="text-slate-300">{insight.why}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Who?</div>
                  <p className="text-slate-300">{insight.who}</p>
                </div>
                <button
                  onClick={onNavigate}
                  className="mt-1 inline-flex items-center gap-1.5 text-teal-300 text-xs font-medium chip px-2.5 py-1.5 rounded-full"
                >
                  {insight.action} <ArrowUpRight size={12} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
