/**
 * RoleHeroBanner — coloured top banner used at the top of every role dashboard.
 * Receives theme from parent (no useRoleTheme inside to keep it pure).
 */
export default function RoleHeroBanner({ theme, title, subtitle, stats = [] }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-6 text-white shadow-lg mb-2"
      style={{ background: `linear-gradient(135deg, ${theme.bannerFrom} 0%, ${theme.bannerTo} 100%)` }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon + text */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 shrink-0">
            <i className={`${theme.icon} text-xl`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold font-heading leading-tight">{title}</h1>
            <p className="text-[0.8rem] text-white/70 mt-0.5 leading-snug">{subtitle}</p>
          </div>
        </div>

        {/* Inline mini-stats */}
        {stats.length > 0 && (
          <div className="flex gap-4 sm:gap-6 shrink-0">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-extrabold font-heading leading-none">{value}</div>
                <div className="text-[0.65rem] text-white/60 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
