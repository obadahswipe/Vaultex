import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { showError } from '@/components/shared/form';
import { DEMO_PASSWORD } from '@/api/auth.api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface PortalLoginProps {
  titleEn: string;
  titleAr: string;
  demoEmail: string;
  accent: 'emerald' | 'amber';
  onLogin: (email: string, password: string) => Promise<void>;
}

/** Sign-in page shared by the client and partner portals. */
export function PortalLogin({ titleEn, titleAr, demoEmail, accent, onLogin }: PortalLoginProps) {
  const { t, tr, lang, toggleLang } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const go = async (e: string, p: string) => {
    setLoading(true);
    try { await onLogin(e, p); } catch (err) { showError(err); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gradient-bg-soft p-4">
      <button onClick={toggleLang} className="absolute end-5 top-5 inline-flex h-8 items-center rounded-lg border border-border/70 bg-card px-2.5 text-[12px] font-bold hover:bg-accent">
        {lang === 'en' ? 'عربي' : 'English'}
      </button>
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className={cn('mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-shadow-3', accent === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-600')}>
            <span className="text-xl font-bold text-white">FX</span>
          </div>
          <h1 className="text-2xl font-bold">{t('app.name')}</h1>
          <p className={cn('mt-1 font-semibold', accent === 'emerald' ? 'text-emerald-600' : 'text-amber-600')}>{tr(titleEn, titleAr)}</p>
        </div>

        <div className="card-elevated rounded-2xl px-8 py-8">
          <Button variant="gradient" size="lg" className="w-full" disabled={loading} onClick={() => go(demoEmail, DEMO_PASSWORD)}>
            {loading ? <LoadingSpinner className="h-4 w-4" /> : tr('Open the demo with one click', 'افتح النسخة التجريبية بضغطة واحدة')}
          </Button>
          <div className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />{tr('or sign in yourself', 'أو سجّل الدخول بنفسك')}<span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); go(email, password); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{tr('Email', 'البريد الإلكتروني')}</Label>
              <Input type="email" placeholder={demoEmail} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{tr('Password', 'كلمة المرور')}</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={loading}>{tr('Sign in', 'تسجيل الدخول')}</Button>
          </form>
          <p className="mt-4 rounded-xl bg-muted/60 px-4 py-2 text-center text-xs text-muted-foreground" dir="ltr">{demoEmail} / {DEMO_PASSWORD}</p>
        </div>

        <Link to="/demo" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />{tr('Back to the home page', 'العودة للصفحة الرئيسية')}
        </Link>
      </div>
    </div>
  );
}
