import { Mail, Hash, HandCoins, Network } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';
import { useBooks } from '@/stores/books.store';
import { fmtUSD } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useMyIB } from './useMyIB';

export default function IBProfile() {
  const { tr, nameOf } = useTranslation();
  const me = useMyIB();
  const ibs = useBooks((s) => s.ibs);
  if (!me) return null;
  const parent = ibs.find((i) => i.id === me.ib.parentIBId);
  const subs = ibs.filter((i) => i.parentIBId === me.ib.id);
  return (
    <div className="space-y-6">
      <h1 className="text-[1.75rem] font-bold tracking-tight">{tr('Me', 'حسابي')}</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={nameOf(me.ib)}>
          <div className="space-y-3 text-[14px]">
            {me.ib.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{me.ib.email}</p>}
            <p className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />{tr('MT5 account', 'حساب MT5')} {me.ib.mt5AccountNo}</p>
            <p className="flex items-center gap-2"><HandCoins className="h-4 w-4 text-muted-foreground" />{tr(`${fmtUSD(me.ib.commissionRate, 2)} for every lot`, `${fmtUSD(me.ib.commissionRate, 2)} عن كل لوت`)}</p>
            {parent && <p className="flex items-center gap-2"><Network className="h-4 w-4 text-muted-foreground" />{tr('I work under', 'أعمل تحت')} {nameOf(parent)}</p>}
          </div>
        </SectionCard>
        <SectionCard title={tr('Partners who work under me', 'شركاء يعملون تحتي')} padded={false}>
          <ul className="divide-y divide-border/40">
            {subs.map((s) => <li key={s.id} className="px-6 py-3 text-[14px]">{nameOf(s)} · {fmtUSD(s.commissionRate, 2)}/{tr('lot', 'لوت')}</li>)}
            {subs.length === 0 && <li className="px-6 py-8 text-center text-[13px] text-muted-foreground">{tr('Nobody yet.', 'لا أحد بعد.')}</li>}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
