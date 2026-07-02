import { APP_CONFIG } from '@constants/appConfig';

/**
 * LoginBrandPanel — left-side brand panel shown on the login page.
 * Displays logo, mission statement, feature highlights and adoption bands.
 */
export default function LoginBrandPanel() {
  const { brand, adoptionBands } = APP_CONFIG;

  const { features } = brand;

  return (
    <div className="hidden md:flex flex-col items-start justify-center flex-1 p-12 bg-gradient-to-br from-green-950 via-green-900 to-green-800 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/[0.04] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-white/[0.04] pointer-events-none" />
      <div className="absolute top-1/3 right-8 w-32 h-32 rounded-full bg-white/[0.03] pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/12 mb-6 ring-1 ring-white/15">
        <img src={brand.logoSrc} alt={`${brand.name} logo`} className="w-8 h-8" />
      </div>

      <div className="text-[1.6rem] font-bold font-heading tracking-tight mb-1">{brand.name}</div>
      <div className="text-sm text-white/60 mb-8 leading-relaxed">
        {brand.tagline}<br />
        <span className="text-xs text-white/38">{brand.description}&nbsp;&middot;&nbsp;Field Representative Management</span>
      </div>

      {/* Feature list */}
      <ul className="space-y-3 mb-8 w-full max-w-xs">
        {features.map(({ icon, text }) => (
          <li key={text} className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/12 ring-1 ring-white/15 shrink-0">
              <i className={`${icon} text-xs`} aria-hidden="true" />
            </div>
            <span className="text-[0.82rem] text-white/72 leading-snug">{text}</span>
          </li>
        ))}
      </ul>

      {/* Adoption Readiness Bands */}
      <div className="w-full max-w-xs">
        <div className="text-[0.62rem] text-white/38 mb-2.5 font-semibold uppercase tracking-widest">
          Adoption Readiness Bands
        </div>
        <div className="flex gap-2">
          {adoptionBands.map(({ label, range, color, bg }) => (
            <div key={label} style={{ background: bg }} className="flex-1 rounded-xl p-2 text-center ring-1 ring-white/10">
              <div style={{ color }} className="text-sm font-bold">{range}</div>
              <div className="text-[0.58rem] text-white/45 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[0.6rem] text-white/22 px-4">
        {brand.version}&nbsp;|&nbsp;{brand.name}&nbsp;|&nbsp;Prepared by {brand.developer}&nbsp;|&nbsp;{brand.year}
      </div>
    </div>
  );
}
