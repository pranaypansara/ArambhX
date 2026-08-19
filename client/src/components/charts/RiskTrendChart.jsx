import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel-alt px-3 py-2 text-xs">
      <div className="text-slate-500 mb-0.5">{label}</div>
      <div className="text-slate-700 font-mono font-medium">{payload[0].value}% avg. risk</div>
    </div>
  );
}

/** Cohort average risk over the latest N prediction cycles. */
export default function RiskTrendChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c98f9f" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#c98f9f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#f3e7e4" vertical={false} />
        <XAxis dataKey="period" tick={{ fill: '#a98f95', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
        <YAxis tick={{ fill: '#a98f95', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={36} domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone" dataKey="avgRisk" stroke="#c98f9f" strokeWidth={2.5}
          fill="url(#riskFill)" dot={{ r: 3, fill: '#c98f9f', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}