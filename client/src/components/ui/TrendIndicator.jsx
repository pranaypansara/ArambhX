import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function TrendIndicator({ value, suffix = ' pts', invertColor = false }) {
  const isUp = value > 0.5;
  const isDown = value < -0.5;
  const color = isUp ? (invertColor ? '#9fe066' : '#ef6355') : isDown ? (invertColor ? '#ef6355' : '#9fe066') : '#b39a9f';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color }}>
      <Icon size={13} strokeWidth={2.5} />
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
}
