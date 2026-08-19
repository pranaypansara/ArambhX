import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { formatDate } from '@/lib/riskUtils';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="panel-alt px-3 py-2 text-xs">
      <div className="text-slate-400 mb-0.5">{formatDate(p.predicted_at)}</div>
      <div className="text-slate-100 font-mono font-medium">{p.risk_probability}% risk</div>
    </div>
  );
}

export default function StudentRiskLine({ predictions, height = 180 }) {
  const data = predictions.map(p => ({ ...p, label: formatDate(p.predicted_at).split(' ').slice(0, 2).join(' ') }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="#f3e7e4" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#a98f95', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#e6d3d6' }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#a98f95', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={32} />
        <ReferenceLine y={75} stroke="#ef635550" strokeDasharray="3 4" />
        <ReferenceLine y={55} stroke="#eaa73f40" strokeDasharray="3 4" />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone" dataKey="risk_probability" stroke="#c98f9f" strokeWidth={2.5}
          dot={{ r: 4, fill: '#ede0dd', stroke: '#c98f9f', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
          isAnimationActive animationDuration={1100}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
