export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && <div className="text-[11px] uppercase tracking-wider text-[#2A8588] font-mono font-extrabold mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-black text-[#153A5B] tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[#607580] font-medium mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`panel p-5 bg-white border border-[#D9E8E7] shadow-sm rounded-2xl ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h2 className="font-display font-extrabold text-base text-[#153A5B]">{title}</h2>}
            {subtitle && <p className="text-xs text-[#607580] mt-0.5 font-medium">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
