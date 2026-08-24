import { useEffect, useRef, useState } from 'react';

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

export default function KpiCard({ label, value, icon: Icon, accent = '#2A8588', delay = 0, suffix = '' }) {
  const animated = useCountUp(value);
  return (
    <div
      className="panel p-4 count-up flex flex-col gap-3 min-w-0 bg-white border border-hairline shadow-sm rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold" style={{ background: `${accent}1f`, color: accent }}>
            <Icon size={14} />
          </div>
        )}
      </div>
      <div className="font-mono text-3xl font-black text-ink tabular-nums">
        {animated}{suffix}
      </div>
    </div>
  );
}
