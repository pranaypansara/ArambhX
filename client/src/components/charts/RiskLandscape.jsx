import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_STUDENT_SUMMARIES } from '@/data/mockData';
import { riskColor } from '@/lib/riskUtils';

const W = 720, H = 340, PAD = 36;

function xScale(risk) { return PAD + (risk / 100) * (W - PAD * 2); }
function yScale(velocity) {
  const clamped = Math.max(-8, Math.min(14, velocity));
  return H - PAD - ((clamped + 8) / 22) * (H - PAD * 2);
}

export default function RiskLandscape() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const points = useMemo(() => ALL_STUDENT_SUMMARIES.map((s) => ({
    id: s.student.id,
    name: s.student.name,
    risk: s.prediction.risk_probability,
    velocity: s.velocity,
    level: s.prediction.risk_level,
  })), []);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Risk landscape scatter of all students by risk and deterioration velocity">
        {/* quadrant backgrounds */}
        <rect x={PAD} y={PAD} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#9fe06608" />
        <rect x={PAD + (W - PAD * 2) / 2} y={PAD} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#ef635510" />
        <rect x={PAD} y={PAD + (H - PAD * 2) / 2} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#eaa73f08" />
        <rect x={PAD + (W - PAD * 2) / 2} y={PAD + (H - PAD * 2) / 2} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2} fill="#f2884f10" />

        {/* axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e6d3d6" strokeWidth={1} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#e6d3d6" strokeWidth={1} />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="#efe1df" strokeWidth={1} strokeDasharray="3 4" />
        <line x1={PAD} y1={(H) / 2} x2={W - PAD} y2={H / 2} stroke="#efe1df" strokeWidth={1} strokeDasharray="3 4" />

        {/* quadrant labels */}
        <text x={PAD + 8} y={PAD + 16} fill="#5f8a34" fontSize="11" fontFamily="IBM Plex Mono" letterSpacing="0.5">STABLE</text>
        <text x={W - PAD - 8} y={PAD + 16} fill="#ef6355" fontSize="11" fontFamily="IBM Plex Mono" letterSpacing="0.5" textAnchor="end">CRITICAL</text>
        <text x={PAD + 8} y={H - PAD - 8} fill="#8f6521" fontSize="11" fontFamily="IBM Plex Mono" letterSpacing="0.5">WATCH</text>
        <text x={W - PAD - 8} y={H - PAD - 8} fill="#95522b" fontSize="11" fontFamily="IBM Plex Mono" letterSpacing="0.5" textAnchor="end">DETERIORATING</text>

        {/* axis captions */}
        <text x={W / 2} y={H - 6} fill="#9c8288" fontSize="10" fontFamily="IBM Plex Mono" textAnchor="middle">RISK PROBABILITY →</text>
        <text x={12} y={H / 2} fill="#9c8288" fontSize="10" fontFamily="IBM Plex Mono" textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`}>DETERIORATION VELOCITY →</text>

        {points.map((p, i) => {
          const cx = xScale(p.risk);
          const cy = yScale(p.velocity);
          const color = riskColor(p.level);
          const isHover = hovered === p.id;
          return (
            <g key={p.id} className="node-in" style={{ animationDelay: `${i * 18}ms` }}>
              {/* comet trail hinting at recent trajectory */}
              <line
                x1={cx - (p.velocity > 0 ? 14 : -10)} y1={cy + 6}
                x2={cx} y2={cy}
                stroke={color} strokeWidth={1.5} opacity={0.25}
              />
              <circle
                cx={cx} cy={cy} r={isHover ? 8 : 5.5}
                fill={color} opacity={isHover ? 1 : 0.85}
                stroke={isHover ? '#ede0dd' : 'none'} strokeWidth={2}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/students/${p.id}`)}
              />
            </g>
          );
        })}
      </svg>

      {hovered && (() => {
        const p = points.find(pt => pt.id === hovered);
        return (
          <div
            className="absolute panel-alt px-3 py-2 text-xs pointer-events-none shadow-xl"
            style={{ left: `${(xScale(p.risk) / W) * 100}%`, top: `${(yScale(p.velocity) / H) * 100}%`, transform: 'translate(-50%, -130%)' }}
          >
            <div className="text-slate-100 font-medium">{p.name}</div>
            <div className="text-slate-400 font-mono">{p.risk}% risk · {p.velocity > 0 ? '+' : ''}{p.velocity} pts velocity</div>
          </div>
        );
      })()}
    </div>
  );
}
