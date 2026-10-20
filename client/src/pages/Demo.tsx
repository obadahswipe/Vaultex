import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronDown, Sun, Moon, Sparkles,
  BarChart3, ShieldCheck, Globe2, Users, TrendingUp,
  Bell, ArrowRight, CheckCircle2, ArrowLeftRight, Landmark,
  LayoutGrid, Network, User, FileSpreadsheet, MessageCircleWarning,
  Scale, Building2, Clock, CalendarCheck, Wallet,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PortalEntryScreen } from '@/components/shared/PortalEntryScreen';
import { useClientAuthStore } from '@/stores/clientAuth.store';
import { useIBAuthStore } from '@/stores/ibAuth.store';
import { useAuthStore } from '@/stores/auth.store';
import { authLogin, DEMO_PASSWORD } from '@/api/auth.api';
import { useUIStore } from '@/stores/ui.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { clientLogin } from '@/api/clientPortal.api';
import { ibLogin } from '@/api/ib.api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/* ── Scroll-reveal hook ────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Animated counter ──────────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame = 0;
    const total = 60;
    const tick = () => {
      frame++;
      setVal(Math.round((frame / total) * to));
      if (frame < total) requestAnimationFrame(tick);
    };
    const t = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(t);
  }, [to]);
  return <>{val.toLocaleString()}{suffix}</>;
}

/* ── Section heading ───────────────────────────────────────── */
function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-12 text-center">
      <h2 className="text-3xl font-bold text-foreground">{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-2xl text-[16px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ── Feature card ──────────────────────────────────────────── */
function FeatureCard({
  icon: Icon, title, description, gradient, delay = 0,
}: {
  icon: typeof BarChart3;
  title: string;
  description: string;
  gradient: string;
  delay?: number;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6',
        'transition-all duration-500 hover:border-primary/30 hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.2)] hover:-translate-y-1',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={cn('mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl', gradient)}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="mb-2 text-[16px] font-semibold text-foreground">{title}</h3>
      <p className="text-[14px] leading-relaxed text-muted-foreground">{description}</p>
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.06), transparent 70%)' }} />
    </div>
  );
}

/* ── Problem card ──────────────────────────────────────────── */
function ProblemCard({
  icon: Icon, title, description, delay = 0,
}: { icon: typeof BarChart3; title: string; description: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-red-500/15 bg-card p-6 transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
        <Icon className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="mb-2 text-[16px] font-semibold text-foreground">{title}</h3>
      <p className="text-[14px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/* ── How-it-works step ─────────────────────────────────────── */
function StepCard({
  number, stepLabel, title, description, gradient, delay = 0,
}: {
  number: number; stepLabel: string; title: string; description: string; gradient: string; delay?: number;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-2xl border border-border/60 bg-card p-6 text-center transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={cn('mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-2xl font-extrabold text-white shadow-lg', gradient)}>
        {number}
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">{stepLabel} {number}</p>
      <h3 className="mt-1 text-[17px] font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/* ── Savings item ──────────────────────────────────────────── */
function SaveItem({
  icon: Icon, value, label, delay = 0,
}: { icon: typeof BarChart3; value: string; label: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-emerald-500/20 bg-card p-6 text-center transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
        <Icon className="h-6 w-6 text-emerald-500" />
      </div>
      <p className="text-3xl font-extrabold text-foreground">{value}</p>
      <p className="mt-1 text-[14px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Portal access card ────────────────────────────────────── */
function PortalCard({
  icon: Icon,
  iconBg,
  accentColor,
  title,
  tagline,
  points,
  buttonLabel,
  buttonClass,
  onEnter,
  loading,
  href,
  delay = 0,
}: {
  icon: typeof User;
  iconBg: string;
  accentColor: string;
  title: string;
  tagline: string;
  points: string[];
  buttonLabel: string;
  buttonClass: string;
  onEnter?: () => void;
  loading?: boolean;
  href?: string;
  delay?: number;
}) {
  const { ref, visible } = useInView(0.08);
  const buttonClasses = cn(
    'flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60',
    buttonClass,
  );
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border bg-card',
        'transition-all duration-500 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1',
        accentColor,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Top accent strip */}
      <div className={cn('h-1 w-full', iconBg)} />

      <div className="flex flex-col flex-1 p-7">
        <div className={cn('mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl', iconBg)}>
          <Icon className="h-7 w-7 text-white" />
        </div>

        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-[14px] font-semibold text-primary">{tagline}</p>
        <ul className="mt-4 space-y-2">
          {points.map((pt) => (
            <li key={pt} className="flex items-start gap-2 text-[14px] text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {pt}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          {href ? (
            <Link to={href} className={buttonClasses}>
              {buttonLabel}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          ) : (
            <button onClick={onEnter} disabled={loading} className={buttonClasses}>
              {buttonLabel}
              {loading ? <LoadingSpinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 rtl:rotate-180" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── FAQ item ──────────────────────────────────────────────── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-2xl border border-border/60 bg-card px-5 py-4 transition-colors open:border-primary/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{answer}</p>
    </details>
  );
}

/* ── Floating pill badge ───────────────────────────────────── */
function FloatingPill({
  label, style,
}: { label: string; style: React.CSSProperties }) {
  return (
    <div
      className="pointer-events-none absolute select-none rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/20 backdrop-blur-sm"
      style={style}
    >
      {label}
    </div>
  );
}

/* ── Stat item (uses its own inView hook) ──────────────────── */
function StatItem({ value, suffix, label, delay }: {
  value: number; suffix: string; label: string; delay: number;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn(
        'text-center transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-3xl font-extrabold tabular-nums text-foreground">
        <Counter to={value} suffix={suffix} />
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Admin panel mockup ────────────────────────────────────── */
function AppMockup() {
  const { ref, visible } = useInView(0.08);
  const { t } = useTranslation();

  /* category cards mimicking the real admin panel */
  const cats = [
    { label: 'Funds',    accent: 'bg-orange-400', dot: 'bg-orange-400',  bar: 72 },
    { label: 'Banks',    accent: 'bg-sky-400',    dot: 'bg-sky-400',     bar: 88 },
    { label: 'Clients',  accent: 'bg-pink-400',   dot: 'bg-pink-400',    bar: 61 },
    { label: 'Revenue',  accent: 'bg-violet-400', dot: 'bg-violet-400',  bar: 45 },
    { label: 'Expenses', accent: 'bg-red-400',    dot: 'bg-red-400',     bar: 29 },
    { label: 'IB Comm',  accent: 'bg-amber-400',  dot: 'bg-amber-400',   bar: 53 },
  ];

  /* sidebar nav items */
  const navItems = [true, false, false, false, false, false, false];

  /* chart bars mimicking equity trend */
  const bars = [38, 52, 44, 67, 55, 78, 62, 85, 70, 91, 76, 94];

  return (
    <div
      ref={ref}
      className={cn(
        'relative mx-auto mt-16 max-w-4xl transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-14',
      )}
    >
      {/* ── Floating badges around the mockup ──────────────────── */}

      {/* 1. Numbers match — top right, emerald */}
      <div
        className="absolute -right-2 top-10 z-20 hidden sm:flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 shadow-[0_8px_24px_rgba(16,185,129,0.45)] text-white text-[11px] font-bold"
        style={{ animation: 'float-slow 6s ease-in-out infinite' }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        {t('demo.mock.matched')}
      </div>

      {/* 2. EUR/USD rate — top right, below matched */}
      <div
        className="absolute -right-6 top-[88px] z-20 hidden sm:flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-[10px]"
        style={{ animation: 'float-slow 9s ease-in-out infinite', animationDelay: '-2s' }}
        dir="ltr"
      >
        <span className="font-mono font-bold text-foreground text-[11px]">EUR/USD</span>
        <span className="font-mono text-emerald-500 font-semibold">1.0847</span>
        <span className="text-emerald-400 text-[9px]">▲ 0.12%</span>
      </div>

      {/* 3. Trade closed profit — top left corner, green */}
      <div
        className="absolute -left-6 -top-4 z-20 hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 shadow-[0_8px_24px_rgba(16,185,129,0.35)] text-white text-[11px] font-bold"
        style={{ animation: 'float-slow 7s ease-in-out infinite', animationDelay: '-4s' }}
      >
        <TrendingUp className="h-3.5 w-3.5" />
        {t('demo.mock.trade')}
      </div>

      {/* 4. New withdrawal request — left mid */}
      <div
        className="absolute -left-4 top-28 z-20 hidden sm:block rounded-xl border border-border/60 bg-card px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)] text-[10px]"
        style={{ animation: 'float-slow 8s ease-in-out infinite', animationDelay: '-3s' }}
      >
        <p className="font-semibold text-foreground text-[11px]">{t('demo.mock.request')}</p>
        <p className="text-muted-foreground mt-0.5">{t('demo.mock.requestSub')}</p>
        <div className="mt-1.5 flex items-center gap-1">
          <div className="h-1 flex-1 rounded-full bg-amber-400/30">
            <div className="h-1 w-3/4 rounded-full bg-amber-400" />
          </div>
          <span className="text-amber-500 font-medium">{t('demo.mock.waiting')}</span>
        </div>
      </div>

      {/* 5. Partner pay chip — right mid */}
      <div
        className="absolute -right-4 top-[44%] z-20 hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 shadow-[0_8px_20px_rgba(245,158,11,0.2)] text-[11px]"
        style={{ animation: 'float-slow 11s ease-in-out infinite', animationDelay: '-6s' }}
      >
        <Network className="h-3 w-3 text-amber-500" />
        <span className="font-semibold text-amber-600 dark:text-amber-400">{t('demo.mock.partnerPay')}</span>
      </div>

      {/* 6. Approvals waiting — right bottom */}
      <div
        className="absolute -right-3 bottom-14 z-20 hidden sm:flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 shadow-[0_8px_24px_rgba(37,99,235,0.4)] text-white text-[11px] font-bold"
        style={{ animation: 'float-slow 9s ease-in-out infinite', animationDelay: '-1.5s' }}
      >
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px] font-extrabold">3</div>
        {t('demo.mock.approvals')}
      </div>

      {/* 7. All numbers add up — bottom left */}
      <div
        className="absolute -bottom-3 left-8 z-20 hidden sm:flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary shadow-[0_4px_16px_hsl(var(--primary)/0.2)]"
        style={{ animation: 'float-slow 10s ease-in-out infinite', animationDelay: '-5s' }}
      >
        <Scale className="h-3 w-3" />
        {t('demo.mock.allGood')}
      </div>

      {/* 8. Day closed — bottom right */}
      <div
        className="absolute -bottom-5 right-12 z-20 hidden sm:flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-[10px] font-semibold text-violet-500 shadow-[0_4px_16px_rgba(139,92,246,0.2)]"
        style={{ animation: 'float-slow 13s ease-in-out infinite', animationDelay: '-7s' }}
      >
        <ShieldCheck className="h-3 w-3" />
        {t('demo.mock.dayClosed')}
      </div>

      {/* 9. Mini sparkline chip — left bottom */}
      <div
        className="absolute -left-2 bottom-10 z-20 hidden sm:flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.1)] text-[10px]"
        style={{ animation: 'float-slow 12s ease-in-out infinite', animationDelay: '-9s' }}
      >
        <div className="flex items-end gap-0.5 h-5">
          {[40, 55, 48, 70, 62, 85, 78].map((h, i) => (
            <div key={i} className="w-1 rounded-sm bg-gradient-to-t from-blue-500 to-violet-400" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div>
          <p className="font-semibold text-foreground">{t('demo.mock.money')}</p>
          <p className="text-emerald-500 font-bold" dir="ltr">+14.2%</p>
        </div>
      </div>

      {/* 10. Live ping dot — overlaid on mockup */}
      <div
        className="absolute right-[28%] top-[60px] z-20 hidden sm:block"
        style={{ animation: 'float-slow 7s ease-in-out infinite', animationDelay: '-1s' }}
      >
        <div className="relative flex h-4 w-4 items-center justify-center">
          <div className="absolute h-4 w-4 rounded-full bg-emerald-400/30 animate-ping" />
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* ── Browser shell ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_32px_96px_-16px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.04)]" dir="ltr">

        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/50 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
            <div className="h-3 w-3 rounded-full bg-green-400/80" />
          </div>
          <div className="mx-auto flex w-52 items-center gap-1.5 rounded-md bg-background/80 px-2.5 py-1 border border-border/40">
            <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
            <span className="text-[10px] text-muted-foreground">app.vaultex.com / dashboard</span>
          </div>
          <div className="flex items-center gap-1.5 ms-auto">
            <div className="h-5 w-5 rounded-md bg-muted/60" />
            <div className="h-5 w-5 rounded-md bg-muted/60" />
          </div>
        </div>

        {/* ── App layout ──────────────────────────────────────────── */}
        <div className="grid grid-cols-[52px_1fr]">

          {/* Sidebar — always dark, matches real app */}
          <div className="flex flex-col items-center gap-2 border-e border-white/5 bg-[hsl(222_47%_9%)] px-2 py-3">
            <div className="mb-1 h-7 w-7 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.5)]">
              <span className="text-[8px] font-extrabold text-white">FX</span>
            </div>
            {navItems.map((active, i) => (
              <div
                key={i}
                className={cn(
                  'h-7 w-full rounded-lg transition-colors',
                  active ? 'bg-blue-500/25 ring-1 ring-blue-500/30' : 'bg-white/4',
                )}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="bg-[hsl(var(--background))] p-3 space-y-2.5">

            {/* Top bar */}
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-20 rounded-full bg-foreground/20" />
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
              <div className="h-2 w-14 rounded-full bg-muted-foreground/20" />
              <div className="ms-auto flex items-center gap-1.5">
                <div className="h-5 w-24 rounded-lg border border-border/50 bg-muted/40" />
                <div className="relative h-5 w-5 rounded-lg bg-muted/40">
                  <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-blue-500 ring-1 ring-card" />
                </div>
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-600" />
              </div>
            </div>

            {/* Category cards — 6 in a row, mimicking real dashboard */}
            <div className="grid grid-cols-6 gap-1.5">
              {cats.map((c) => (
                <div key={c.label} className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-2">
                  <div className={cn('absolute left-0 top-0 h-full w-0.5 rounded-s-xl', c.accent)} />
                  <div className="ms-1">
                    <div className="flex items-center gap-1 mb-1">
                      <div className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
                      <div className="h-1.5 w-8 rounded-full bg-muted-foreground/30" />
                    </div>
                    <div className="h-2.5 w-10 rounded-full bg-foreground/15 mb-1.5" />
                    <div className="h-0.5 w-full rounded-full bg-muted/40">
                      <div className={cn('h-0.5 rounded-full', c.accent)} style={{ width: `${c.bar}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart + table row */}
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div className="rounded-xl border border-border/50 bg-card p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-2 w-20 rounded-full bg-foreground/15" />
                  <div className="h-1.5 w-10 rounded-full bg-muted/50" />
                </div>
                <div className="flex h-12 items-end gap-0.5 pb-0">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-600/70 via-violet-500/50 to-violet-400/20"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between">
                  {['Jan', 'Apr', 'Jul', 'Oct'].map((m) => (
                    <div key={m} className="h-1.5 w-4 rounded-full bg-muted/40" />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card p-2 space-y-1.5">
                <div className="h-2 w-14 rounded-full bg-foreground/15 mb-2" />
                {[
                  { dot: 'bg-emerald-400', status: 'bg-emerald-400/20 text-emerald-600' },
                  { dot: 'bg-amber-400',   status: 'bg-amber-400/20 text-amber-600'   },
                  { dot: 'bg-emerald-400', status: 'bg-emerald-400/20 text-emerald-600' },
                  { dot: 'bg-blue-400',    status: 'bg-blue-400/20 text-blue-600'     },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className={cn('h-1.5 w-1.5 shrink-0 rounded-full', row.dot)} />
                    <div className="h-1.5 flex-1 rounded-full bg-muted/50" />
                    <div className={cn('h-3 w-7 rounded-md', row.status)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom health bar */}
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-soft" />
              <div className="h-1.5 w-24 rounded-full bg-foreground/15" />
              <div className="ms-auto flex gap-1">
                {[90, 75, 88].map((v, i) => (
                  <div key={i} className="h-3 w-8 overflow-hidden rounded-md bg-muted/40">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-emerald-400 to-teal-400"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function DemoPage() {
  const navigate = useNavigate();
  const { setAuth: setClientAuth, clientUser } = useClientAuthStore();
  const { setAuth: setIBAuth, ibUser } = useIBAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { t, lang, toggleLang } = useTranslation();

  const { token: adminToken, setAuth: setAdminAuth } = useAuthStore();
  const [clientLoading, setClientLoading] = useState(false);
  const [ibLoading, setIBLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [activeEntry, setActiveEntry] = useState<'admin' | 'client' | 'ib' | null>(null);

  const handleAdminEnter = async () => {
    if (adminToken) { setActiveEntry('admin'); return; }
    setAdminLoading(true);
    try {
      const r = await authLogin({ email: 'admin@demo.com', password: DEMO_PASSWORD });
      setAdminAuth(r.token, r.user);
      setActiveEntry('admin');
    } catch {
      toast({ title: t('demo.loginFailed'), variant: 'destructive' });
    } finally { setAdminLoading(false); }
  };

  const handleClientEnter = async () => {
    if (clientUser) { setActiveEntry('client'); return; }
    setClientLoading(true);
    try {
      const r = await clientLogin('client@demo.com', 'Demo@123456');
      setClientAuth(r.token, r.user);
      setActiveEntry('client');
    } catch {
      toast({ title: t('demo.loginFailed'), variant: 'destructive' });
    } finally { setClientLoading(false); }
  };

  const handleIBEnter = async () => {
    if (ibUser) { setActiveEntry('ib'); return; }
    setIBLoading(true);
    try {
      const r = await ibLogin('ib@demo.com', 'Demo@123456');
      setIBAuth(r.token, r.user);
      setActiveEntry('ib');
    } catch {
      toast({ title: t('demo.loginFailed'), variant: 'destructive' });
    } finally { setIBLoading(false); }
  };

  const problems = [
    { icon: FileSpreadsheet,      title: t('demo.problem.p1.title'), description: t('demo.problem.p1.desc') },
    { icon: MessageCircleWarning, title: t('demo.problem.p2.title'), description: t('demo.problem.p2.desc') },
    { icon: Scale,                title: t('demo.problem.p3.title'), description: t('demo.problem.p3.desc') },
  ];

  const features = [
    { icon: ArrowLeftRight, title: t('demo.f1.title'), description: t('demo.f1.desc'), gradient: 'bg-gradient-to-br from-blue-500 to-blue-700' },
    { icon: Users,          title: t('demo.f2.title'), description: t('demo.f2.desc'), gradient: 'bg-gradient-to-br from-pink-500 to-rose-600' },
    { icon: Network,        title: t('demo.f3.title'), description: t('demo.f3.desc'), gradient: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { icon: Landmark,       title: t('demo.f4.title'), description: t('demo.f4.desc'), gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700' },
    { icon: TrendingUp,     title: t('demo.f5.title'), description: t('demo.f5.desc'), gradient: 'bg-gradient-to-br from-violet-500 to-violet-700' },
    { icon: BarChart3,      title: t('demo.f6.title'), description: t('demo.f6.desc'), gradient: 'bg-gradient-to-br from-cyan-500 to-cyan-700' },
    { icon: Building2,      title: t('demo.f7.title'), description: t('demo.f7.desc'), gradient: 'bg-gradient-to-br from-slate-500 to-slate-700' },
    { icon: ShieldCheck,    title: t('demo.f8.title'), description: t('demo.f8.desc'), gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-700' },
    { icon: Bell,           title: t('demo.f9.title'), description: t('demo.f9.desc'), gradient: 'bg-gradient-to-br from-red-500 to-red-700' },
  ];

  const steps = [
    { title: t('demo.how.s1.title'), description: t('demo.how.s1.desc'), gradient: 'bg-gradient-to-br from-blue-500 to-blue-700' },
    { title: t('demo.how.s2.title'), description: t('demo.how.s2.desc'), gradient: 'bg-gradient-to-br from-violet-500 to-violet-700' },
    { title: t('demo.how.s3.title'), description: t('demo.how.s3.desc'), gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700' },
  ];

  const savings = [
    { icon: Clock,         value: t('demo.save.s1.value'), label: t('demo.save.s1.label') },
    { icon: Wallet,        value: t('demo.save.s2.value'), label: t('demo.save.s2.label') },
    { icon: CalendarCheck, value: t('demo.save.s3.value'), label: t('demo.save.s3.label') },
  ];

  const stats = [
    { value: 1, label: t('demo.stats.place')  },
    { value: 3, label: t('demo.stats.doors')  },
    { value: 2, label: t('demo.stats.langs')  },
    { value: 2, label: t('demo.stats.checks') },
  ];

  const checks = [
    t('demo.check.noSetup'),
    t('demo.check.preloaded'),
    t('demo.check.arabic'),
    t('demo.check.pwa'),
  ];

  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({
    question: t(`demo.faq.q${n}` as 'demo.faq.q1'),
    answer:   t(`demo.faq.a${n}` as 'demo.faq.a1'),
  }));

  const navLinks = [
    { href: '#what', label: t('demo.nav.what') },
    { href: '#how',  label: t('demo.nav.how')  },
    { href: '#faq',  label: t('demo.nav.faq')  },
  ];

  /* floating pill labels */
  const floatingPills = [
    { label: t('demo.pill.fast'),       style: { top: '12%',  left: '8%',   animationDuration: '9s',  animationDelay: '0s'   } },
    { label: t('demo.pill.safe'),       style: { top: '18%',  right: '10%', animationDuration: '11s', animationDelay: '-3s'  } },
    { label: t('demo.pill.lang'),       style: { top: '62%',  left: '6%',   animationDuration: '13s', animationDelay: '-1.5s'} },
    { label: t('demo.pill.reports'),    style: { top: '55%',  right: '7%',  animationDuration: '10s', animationDelay: '-4s'  } },
    { label: t('demo.pill.currencies'), style: { top: '80%',  left: '18%',  animationDuration: '14s', animationDelay: '-2s'  } },
    { label: t('demo.pill.math'),       style: { top: '78%',  right: '15%', animationDuration: '8s',  animationDelay: '-5s'  } },
  ];

  const primaryButton = 'flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_24px_hsl(217_91%_60%/0.4)] transition-all hover:shadow-[0_4px_32px_hsl(217_91%_60%/0.6)] hover:-translate-y-0.5';
  const secondaryButton = 'flex items-center gap-2 rounded-2xl border border-border bg-card px-7 py-3.5 text-[15px] font-semibold text-foreground transition-all hover:bg-muted hover:border-primary/30';

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Portal entry overlay */}
      {activeEntry && (
        <PortalEntryScreen
          portal={activeEntry}
          onComplete={() => navigate(activeEntry === 'admin' ? '/' : activeEntry === 'client' ? '/client/dashboard' : '/ib/dashboard')}
        />
      )}

      {/* ── Sticky navbar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-[0_0_16px_hsl(217_91%_60%/0.4)]">
              <span className="text-[13px] font-bold tracking-tight text-white">FX</span>
            </div>
            <div>
              <p className="text-[15px] font-bold leading-tight text-foreground">{t('app.name')}</p>
              <p className="hidden text-[11px] leading-tight text-muted-foreground sm:block">{t('demo.tagline')}</p>
            </div>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="rounded-xl px-3 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              aria-label={t('nav.toggleLanguage')}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-2.5 text-[12px] font-bold text-foreground transition-all hover:bg-muted hover:border-primary/30"
            >
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
            <button
              onClick={toggleTheme}
              aria-label={t('nav.toggleTheme')}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a
              href="#try"
              className="hidden h-9 items-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-[13px] font-bold text-white shadow-[0_2px_12px_hsl(217_91%_60%/0.35)] transition-all hover:opacity-90 sm:inline-flex"
            >
              {t('demo.cta.try')}
            </a>
          </div>
        </div>
      </header>

      {/* ── 1. Hero: what is this? ─────────────────────────────── */}
      <section id="top" className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">

        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-32 left-1/2 h-[680px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-600/25 to-violet-600/15 blur-3xl"
            style={{ animation: 'drift 18s ease-in-out infinite' }}
          />
          <div
            className="absolute -right-24 -top-16 h-96 w-96 rounded-full bg-gradient-to-bl from-violet-500/20 to-transparent blur-3xl"
            style={{ animation: 'float-slow 12s ease-in-out infinite', animationDelay: '-4s' }}
          />
          <div
            className="absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-500/15 to-transparent blur-3xl"
            style={{ animation: 'float-slow 10s ease-in-out infinite', animationDelay: '-2s' }}
          />
          <div
            className="absolute -bottom-8 right-0 h-64 w-64 rounded-full bg-gradient-to-tl from-pink-500/10 to-transparent blur-3xl"
            style={{ animation: 'float-slow 14s ease-in-out infinite', animationDelay: '-6s' }}
          />
          <div
            className="absolute left-0 top-1/2 h-48 w-48 rounded-full bg-gradient-to-r from-cyan-500/8 to-transparent blur-3xl"
            style={{ animation: 'float-slow 16s ease-in-out infinite', animationDelay: '-8s' }}
          />
          <div className="absolute inset-0 dot-grid opacity-[0.03]" />
        </div>

        {/* Floating feature pills in hero background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {floatingPills.map((p) => (
            <FloatingPill
              key={p.label}
              label={p.label}
              style={{ ...p.style, animation: `float-x ${p.style.animationDuration} ease-in-out infinite` }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[13px] font-semibold text-primary animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            {t('demo.badge')}
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-slide-up">
            {t('demo.hero.headline1')}{' '}
            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
              {t('demo.hero.headline2')}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-muted-foreground animate-fade-in" style={{ animationDelay: '0.15s' }}>
            {t('demo.hero.sub')}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a href="#try" className={primaryButton}>
              {t('demo.cta.try')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>
            <a href="#how" className={secondaryButton}>
              {t('demo.cta.how')}
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {checks.map((f) => (
              <span key={f} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {f}
              </span>
            ))}
          </div>
        </div>

        <AppMockup />
      </section>

      {/* ── Quick facts ────────────────────────────────────────── */}
      <section className="border-y border-border/40 bg-muted/30 px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s, i) => (
            <StatItem key={s.label} value={s.value} suffix="" label={s.label} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ── 2. The problem ─────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionHeading title={t('demo.problem.heading')} />
          <div className="grid gap-4 sm:grid-cols-3">
            {problems.map((p, i) => (
              <ProblemCard key={p.title} {...p} delay={i * 80} />
            ))}
          </div>
          <p className="mt-10 text-center text-2xl font-bold">
            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
              {t('demo.problem.answer')}
            </span>
          </p>
        </div>
      </section>

      {/* ── 3. What it does ────────────────────────────────────── */}
      <section id="what" className="scroll-mt-16 border-y border-border/40 bg-muted/20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeading title={t('demo.features.heading')} sub={t('demo.features.sub')} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 60} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. How it works ────────────────────────────────────── */}
      <section id="how" className="scroll-mt-16 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionHeading title={t('demo.how.heading')} sub={t('demo.how.sub')} />
          <div className="relative grid gap-6 sm:grid-cols-3">
            {/* connecting line behind the step numbers */}
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-[52px] hidden h-0.5 bg-gradient-to-r from-blue-500/40 via-violet-500/40 to-emerald-500/40 sm:block" />
            {steps.map((s, i) => (
              <StepCard key={s.title} number={i + 1} stepLabel={t('demo.how.step')} {...s} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. What you save ───────────────────────────────────── */}
      <section className="border-y border-border/40 bg-muted/20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionHeading title={t('demo.save.heading')} sub={t('demo.save.sub')} />
          <div className="grid gap-4 sm:grid-cols-3">
            {savings.map((s, i) => (
              <SaveItem key={s.label} {...s} delay={i * 80} />
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-muted-foreground">{t('demo.save.note')}</p>
        </div>
      </section>

      {/* ── 6. Try it: pick a door ─────────────────────────────── */}
      <section id="try" className="scroll-mt-16 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionHeading title={t('demo.try.heading')} sub={t('demo.try.sub')} />

          <div className="grid gap-5 sm:grid-cols-3">
            <PortalCard
              icon={LayoutGrid}
              iconBg="bg-gradient-to-br from-blue-600 to-violet-600"
              accentColor="border-blue-500/20 hover:border-blue-500/50"
              title={t('demo.adminCard.title')}
              tagline={t('demo.adminCard.tagline')}
              points={[t('demo.adminCard.p1'), t('demo.adminCard.p2'), t('demo.adminCard.p3')]}
              buttonLabel={t('demo.adminCard.btn')}
              buttonClass="bg-gradient-to-r from-blue-600 to-violet-600 shadow-[0_4px_16px_hsl(217_91%_60%/0.35)]"
              onEnter={handleAdminEnter}
              loading={adminLoading}
              delay={0}
            />

            <PortalCard
              icon={User}
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
              accentColor="border-emerald-500/20 hover:border-emerald-500/50"
              title={t('demo.clientCard.title')}
              tagline={t('demo.clientCard.tagline')}
              points={[t('demo.clientCard.p1'), t('demo.clientCard.p2'), t('demo.clientCard.p3')]}
              buttonLabel={clientUser ? t('demo.clientCard.btnContinue') : t('demo.clientCard.btn')}
              buttonClass="bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[0_4px_16px_rgb(16_185_129/0.35)]"
              onEnter={handleClientEnter}
              loading={clientLoading}
              delay={120}
            />

            <PortalCard
              icon={Network}
              iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
              accentColor="border-amber-500/20 hover:border-amber-500/50"
              title={t('demo.ibCard.title')}
              tagline={t('demo.ibCard.tagline')}
              points={[t('demo.ibCard.p1'), t('demo.ibCard.p2'), t('demo.ibCard.p3')]}
              buttonLabel={ibUser ? t('demo.ibCard.btnContinue') : t('demo.ibCard.btn')}
              buttonClass="bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_4px_16px_rgb(245_158_11/0.35)]"
              onEnter={handleIBEnter}
              loading={ibLoading}
              delay={240}
            />
          </div>
        </div>
      </section>

      {/* ── 7. Questions ───────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-16 border-t border-border/40 bg-muted/20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SectionHeading title={t('demo.faq.heading')} />
          <div className="space-y-3">
            {faqs.map((f) => (
              <FaqItem key={f.question} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/8 via-violet-600/6 to-transparent" />
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.035]" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[13px] font-semibold text-primary">
            <Globe2 className="h-3.5 w-3.5" />
            {t('demo.cta.readyBadge')}
          </div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t('demo.cta.readyHeadline')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
            {t('demo.cta.readySub')}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="#try" className={primaryButton}>
              {t('demo.cta.try')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>
            <button onClick={handleAdminEnter} className={secondaryButton}>
              <LayoutGrid className="h-4 w-4" />
              {t('demo.adminCard.btn')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
              <span className="text-[10px] font-bold text-white">FX</span>
            </div>
            <span className="text-[14px] font-semibold text-foreground">{t('app.name')}</span>
          </div>
          <span className="hidden text-muted-foreground/40 sm:inline">·</span>
          <span className="text-[13px] text-muted-foreground">{t('demo.footer')}</span>
        </div>
      </footer>
    </div>
  );
}
