import { useEffect, useState } from 'react';
import { LayoutGrid, User, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

type Portal = 'admin' | 'client' | 'ib';

interface PortalEntryScreenProps {
  portal: Portal;
  onComplete: () => void;
}

const CONFIG: Record<Portal, {
  gradient: string;
  glowColor: string;
  icon: typeof User;
  iconBg: string;
  label: { en: string; ar: string };
  tagline: { en: string; ar: string };
  barColor: string;
}> = {
  admin: {
    gradient: 'from-blue-950 via-violet-950 to-slate-950',
    glowColor: 'shadow-[0_0_80px_20px_rgba(99,102,241,0.35)]',
    icon: LayoutGrid,
    iconBg: 'bg-gradient-to-br from-blue-500 to-violet-600',
    label: { en: 'Your company', ar: 'شركتك' },
    tagline: { en: 'Everything is ready for you.', ar: 'كل شيء جاهز لك.' },
    barColor: 'bg-gradient-to-r from-blue-400 to-violet-400',
  },
  client: {
    gradient: 'from-emerald-950 via-teal-950 to-slate-950',
    glowColor: 'shadow-[0_0_80px_20px_rgba(16,185,129,0.30)]',
    icon: User,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    label: { en: 'Client page', ar: 'صفحة الزبون' },
    tagline: { en: 'Your money and trades are ready.', ar: 'أموالك وصفقاتك جاهزة.' },
    barColor: 'bg-gradient-to-r from-emerald-400 to-teal-400',
  },
  ib: {
    gradient: 'from-amber-950 via-orange-950 to-slate-950',
    glowColor: 'shadow-[0_0_80px_20px_rgba(245,158,11,0.30)]',
    icon: Network,
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-600',
    label: { en: 'Partner page', ar: 'صفحة الشريك' },
    tagline: { en: 'Your clients and pay are ready.', ar: 'زبائنك وأجرك جاهزون.' },
    barColor: 'bg-gradient-to-r from-amber-400 to-orange-400',
  },
};

export function PortalEntryScreen({ portal, onComplete }: PortalEntryScreenProps) {
  const cfg = CONFIG[portal];
  const Icon = cfg.icon;
  const { tr } = useTranslation();

  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  // 0 = just mounted (fading in overlay)
  // 1 = icon appears
  // 2 = label slides up
  // 3 = tagline fades in
  // 4 = progress bar fills
  // 5 = exit fade-out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 350),
      setTimeout(() => setPhase(2), 750),
      setTimeout(() => setPhase(3), 1050),
      setTimeout(() => setPhase(4), 1250),
      setTimeout(() => setPhase(5), 2750),
      setTimeout(() => onComplete(),   3150),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center',
        'bg-gradient-to-br', cfg.gradient,
        'transition-all duration-500',
        phase === 5 ? 'opacity-0 scale-[1.03]' : 'opacity-100 scale-100',
      )}
      style={{ animation: 'portal-fade-in 0.4s ease-out forwards' }}
    >
      {/* Subtle dot-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient glow behind icon */}
      <div
        className={cn(
          'absolute h-64 w-64 rounded-full blur-3xl opacity-30 transition-opacity duration-700',
          phase >= 1 ? 'opacity-50' : 'opacity-0',
        )}
        style={{
          background:
            portal === 'admin' ? 'radial-gradient(circle, #6366f1, transparent)'
            : portal === 'client' ? 'radial-gradient(circle, #10b981, transparent)'
            : 'radial-gradient(circle, #f59e0b, transparent)',
        }}
      />

      {/* Ping ring */}
      {phase >= 1 && (
        <div
          className="absolute h-40 w-40 rounded-full border border-white/20 animate-ping-slow"
          style={{ animationDuration: '2s' }}
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 mb-6 flex h-28 w-28 items-center justify-center rounded-3xl',
          cfg.iconBg,
          'transition-all duration-500',
          phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
        )}
        style={phase >= 1 ? { animation: 'portal-scale-in 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards' } : {}}
      >
        <Icon className="h-14 w-14 text-white drop-shadow-lg" strokeWidth={1.5} />
        {/* Icon inner glow */}
        <div className="absolute inset-0 rounded-3xl bg-white/10" />
      </div>

      {/* Portal label */}
      <div
        className={cn(
          'relative z-10 transition-all duration-500',
          phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
        style={phase >= 2 ? { animation: 'portal-slide-up 0.5s ease-out forwards' } : {}}
      >
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          {tr(cfg.label.en, cfg.label.ar)}
        </h1>
      </div>

      {/* Tagline */}
      <div
        className={cn(
          'relative z-10 mt-3 transition-all duration-500',
          phase >= 3 ? 'opacity-100' : 'opacity-0',
        )}
      >
        <p className="text-center text-[15px] font-medium text-white/60">
          {tr(cfg.tagline.en, cfg.tagline.ar)}
        </p>
      </div>

      {/* Progress bar track */}
      <div className="relative z-10 mt-10 w-48 sm:w-64">
        <div className="h-[3px] w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn('h-full rounded-full', cfg.barColor)}
            style={
              phase >= 4
                ? {
                    animation: 'portal-progress 1.5s cubic-bezier(0.4,0,0.2,1) forwards',
                  }
                : { width: '0%' }
            }
          />
        </div>
        {/* Loading dots */}
        <div className="mt-4 flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full bg-white/40 animate-pulse-soft"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
