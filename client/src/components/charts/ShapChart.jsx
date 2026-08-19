export default function ShapChart({ factors, onSelect, selected }) {
  const maxImpact = Math.max(...factors.map(f => f.impact_score), 1);
  return (
    <div className="space-y-3">
      {factors.map((f) => {
        const width = (f.impact_score / maxImpact) * 100;
        const isNeg = f.direction === 'NEGATIVE';
        const color = isNeg ? '#ef6355' : '#9fe066';
        const isSelected = selected === f.feature_name;
        return (
          <button
            key={f.id}
            onClick={() => onSelect?.(f.feature_name)}
            className={`w-full text-left group ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm ${isSelected ? 'text-slate-50 font-medium' : 'text-slate-300'}`}>{f.feature_name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">{f.feature_value}</span>
                <span className="font-mono text-xs font-medium" style={{ color }}>
                  {isNeg ? '↓' : '↑'} {Math.abs(f.delta).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[#f6ece9] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${width}%`, background: color, opacity: isSelected || !selected ? 1 : 0.35 }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">{f.impact_level} impact · score {f.impact_score}</div>
          </button>
        );
      })}
    </div>
  );
}
