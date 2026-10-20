import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, LineChart, Users, ArrowLeft, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { authLogin, DEMO_PASSWORD } from '@/api/auth.api';
import { showError } from '@/components/shared/form';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PortalEntryScreen } from '@/components/shared/PortalEntryScreen';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t, tr, lang, toggleLang } = useTranslation();

  const signIn = async (e?: string, p?: string) => {
    setLoading(true);
    try {
      const result = await authLogin({ email: e ?? email, password: p ?? password });
      setAuth(result.token, result.user);
      setShowEntry(true);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: LineChart,   text: tr('See all your money in one place', 'شاهد كل أموالك في مكان واحد') },
    { icon: Users,       text: tr('Clients, partners and staff together', 'الزبائن والشركاء والموظفون معًا') },
    { icon: ShieldCheck, text: tr('Two people check every payment', 'شخصان يراجعان كل دفعة') },
  ];

  return (
    <>
      {showEntry && <PortalEntryScreen portal="admin" onComplete={() => navigate('/')} />}
      <div className="grid min-h-screen bg-background lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 20% 30%, hsl(222 91% 65%) 0%, hsl(222 84% 56%) 35%, hsl(262 84% 48%) 100%)' }}
          />
          <div aria-hidden className="absolute -left-12 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
          <div aria-hidden className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div aria-hidden className="absolute inset-0 opacity-20 dot-grid" />

          <div className="relative flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <span className="text-sm font-bold text-white">FX</span>
            </div>
            <p className="text-base font-semibold tracking-tight">{t('app.name')}</p>
          </div>

          <div className="relative max-w-lg">
            <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3 w-3" /> {tr('For forex companies', 'لشركات الفوركس')}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
              {tr('Run your whole forex company from one place.', 'أدِر شركة الفوركس كلها من مكان واحد.')}
            </h1>
            <ul className="mt-8 space-y-2.5 text-sm">
              {features.map((f) => (
                <li key={f.text} className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/15 backdrop-blur"><f.icon className="h-3.5 w-3.5" /></span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs opacity-70">© {new Date().getFullYear()} {t('app.name')}</p>
        </div>

        {/* Form panel */}
        <div className="relative flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-30 lg:hidden" />
          <button
            onClick={toggleLang}
            className="absolute end-6 top-6 inline-flex h-8 items-center rounded-lg border border-border/70 bg-card px-2.5 text-[12px] font-bold text-foreground transition-all hover:bg-accent"
          >
            {lang === 'en' ? 'عربي' : 'English'}
          </button>

          <div className="relative w-full max-w-sm">
            <Link to="/demo" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-3 w-3 rtl:rotate-180" /> {tr('Back to the home page', 'العودة للصفحة الرئيسية')}
            </Link>

            <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">{tr('Welcome', 'أهلًا بك')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tr('Sign in to open your company.', 'سجّل الدخول لتفتح شركتك.')}</p>

            <Button variant="gradient" size="lg" className="mt-6 w-full" disabled={loading} onClick={() => signIn('admin@demo.com', DEMO_PASSWORD)}>
              {loading ? <LoadingSpinner className="h-4 w-4" /> : tr('Open the demo with one click', 'افتح النسخة التجريبية بضغطة واحدة')}
            </Button>

            <div className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />{tr('or sign in yourself', 'أو سجّل الدخول بنفسك')}<span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); signIn(); }} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">{tr('Email', 'البريد الإلكتروني')}</Label>
                <Input id="email" type="email" placeholder="admin@demo.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">{tr('Password', 'كلمة المرور')}</Label>
                <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" variant="outline" size="lg" className="w-full" disabled={loading}>
                {tr('Sign in', 'تسجيل الدخول')}
              </Button>
              <p className="rounded-xl bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
                {tr('Demo logins: admin@demo.com, rania@demo.com, omar@demo.com, wael@demo.com · password', 'حسابات تجريبية: admin@demo.com و rania@demo.com و omar@demo.com و wael@demo.com · كلمة المرور')} <span className="font-mono" dir="ltr">{DEMO_PASSWORD}</span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
