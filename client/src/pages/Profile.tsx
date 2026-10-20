import { useMemo } from 'react';
import { User, ShieldCheck, History } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { useBooks } from '@/stores/books.store';
import { useActingUser } from '@/lib/data/hooks';
import { ROLE_LABELS } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function Profile() {
  const { tr, lang } = useTranslation();
  const me = useActingUser();
  const audit = useBooks((s) => s.audit);
  const branches = useBooks((s) => s.branches);
  const mine = useMemo(() => audit.filter((a) => a.by === me.email).slice(0, 12), [audit, me.email]);
  const role = ROLE_LABELS[me.role];
  const branch = branches.find((b) => b.id === me.branchId);

  return (
    <div className="space-y-8">
      <PageHeader title={tr('My profile', 'ملفي')} subtitle={tr('Who you are in Vaultex, and what you did lately.', 'من أنت في فولتكس، وماذا فعلت مؤخرًا.')} />
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title={tr('About me', 'عني')}>
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl gradient-bg text-lg font-bold text-white"><User className="h-6 w-6" /></span>
            <div>
              <p className="text-lg font-bold">{me.name}</p>
              <p className="text-[13px] text-muted-foreground">{me.email}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-[14px]">
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-primary" /><span><span className="font-semibold">{role ? tr(role.en, role.ar) : me.role}</span><br /><span className="text-[13px] text-muted-foreground">{role ? tr(role.doesEn, role.doesAr) : ''}</span></span></p>
            {branch && <p className="text-[13px]">{tr('Branch', 'الفرع')}: {lang === 'ar' ? branch.arabic : branch.name}</p>}
          </div>
          <p className="mt-5 rounded-xl bg-muted/50 p-3 text-[12px] text-muted-foreground">{tr('In the demo, passwords cannot be changed. Every login uses Demo@123456.', 'في النسخة التجريبية لا يمكن تغيير كلمات المرور. كل الحسابات تستخدم Demo@123456.')}</p>
        </SectionCard>
        <SectionCard className="lg:col-span-2" title={tr('What I did lately', 'ما فعلته مؤخرًا')} padded={false}>
          <ul className="divide-y divide-border/40">
            {mine.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-6 py-3">
                <History className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div><p className="text-[14px]">{tr(a.action, a.actionAr)}</p><p className="text-[12px] text-muted-foreground">{new Date(a.at).toLocaleString(lang === 'ar' ? 'ar' : 'en-GB')}</p></div>
              </li>
            ))}
            {mine.length === 0 && <li className="px-6 py-10 text-center text-[13px] text-muted-foreground">{tr('Nothing yet.', 'لا شيء بعد.')}</li>}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
