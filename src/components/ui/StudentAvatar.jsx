import { initials, avatarHue } from '@/lib/riskUtils';

export default function StudentAvatar({ name, size = 36, ring }) {
  const hue = avatarHue(name);
  return (
    <div
      className="flex items-center justify-center rounded-full font-display font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 55% 24%), hsl(${hue + 40} 45% 16%))`,
        color: `hsl(${hue} 70% 78%)`,
        border: ring ? `2px solid ${ring}` : '1px solid #e6d3d6',
      }}
    >
      {initials(name)}
    </div>
  );
}
