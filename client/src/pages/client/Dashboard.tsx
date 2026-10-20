import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, Hourglass } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { MoneyRequestDialog } from '@/components/client/MoneyRequestDialog';
import { fmtMoney } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { useMe, CLIENT_STATUS } from './useMe';

export default function ClientDashboard() {
  const { tr, nameOf } = useTranslation();
  const me = useMe();
  const [kind, setKind] = useState<'deposit' | 'withdrawal' | null>(null);
  if (!me.client) return null;
  const waiting = me.requests.filter((r) => r.status !== 'voucher' && r.status !== 'rejected');

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight">{tr(`Hello, ${me.client.name.split(' ')[0]}`, `مرحبًا يا ${nameOf(me.client).split(' ')[0]}`)}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{tr('Here is your money and your trades.', 'هذه أموالك وصفقاتك.')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="gradient" className="gap-1.5" onClick={() => setKind('deposit')}><ArrowDownLeft className="h-4 w-4" />{tr('Add money', 'أضف مالًا')}</Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setKind('withdrawal')}><ArrowUpRight className="h-4 w-4" />{tr('Take out money', 'اسحب مالًا')}</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={tr('My money', 'أموالي')} value={fmtMoney(me.balance, me.currency)} icon={Wallet} accent="green" deltaLabel={tr(`MT5 account ${me.client.mt5Login}`, `حساب MT5 رقم ${me.client.mt5Login}`)} />
        <StatCard label={tr('Open trades now', 'الصفقات المفتوحة الآن')} value={fmtMoney(me.floating)} icon={TrendingUp} accent={me.floating >= 0 ? 'green' : 'pink'} deltaLabel={tr(`${me.open.length} trades open`, `${me.open.length} صفقات مفتوحة`)} />
        <StatCard label={tr('Requests in progress', 'طلبات قيد التنفيذ')} value={waiting.length} icon={Hourglass} accent="amber" deltaLabel={tr('We are working on them', 'نعمل عليها')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={tr('My requests', 'طلباتي')} action={<Link to="/client/transactions" className="text-[13px] font-medium text-primary">{tr('See all', 'عرض الكل')}</Link>} padded={false}>
          <ul className="divide-y divide-border/40">
            {me.requests.slice(0, 5).map((r) => {
              const s = CLIENT_STATUS[r.status];
              const l = r.lines[0];
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  {r.type === 'deposit' ? <ArrowDownLeft className="h-4 w-4 text-success" /> : <ArrowUpRight className="h-4 w-4 text-warning" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{r.type === 'deposit' ? tr('Add money', 'إضافة مال') : tr('Take out money', 'سحب مال')}</p>
                    <p className="text-[12px] text-muted-foreground">{r.date}</p>
                  </div>
                  <span className="font-mono font-semibold" dir="ltr">{fmtMoney(l?.amount ?? 0, l?.currency)}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', s.tone)}>{tr(s.en, s.ar)}</span>
                </li>
              );
            })}
            {me.requests.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-muted-foreground">{tr('No requests yet.', 'لا طلبات بعد.')}</li>}
          </ul>
        </SectionCard>

        <SectionCard title={tr('My last trades', 'آخر صفقاتي')} action={<Link to="/client/trades" className="text-[13px] font-medium text-primary">{tr('See all', 'عرض الكل')}</Link>} padded={false}>
          <ul className="divide-y divide-border/40">
            {me.trades.slice().reverse().slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-bold', t.side === 'buy' ? 'bg-emerald-500/12 text-emerald-600' : 'bg-red-500/12 text-red-600')}>{t.side === 'buy' ? tr('BUY', 'شراء') : tr('SELL', 'بيع')}</span>
                <span className="font-mono text-[13px] font-semibold">{t.symbol}</span>
                <span className="text-[12px] text-muted-foreground">{t.lots} {tr('lots', 'لوت')}</span>
                <span className="ms-auto text-[11px] text-muted-foreground">{t.status === 'open' ? tr('open', 'مفتوحة') : tr('closed', 'مغلقة')}</span>
                <span className={cn('font-mono text-[13px] font-semibold', t.profit >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtMoney(t.profit)}</span>
              </li>
            ))}
            {me.trades.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-muted-foreground">{tr('No trades yet.', 'لا صفقات بعد.')}</li>}
          </ul>
        </SectionCard>
      </div>

      <MoneyRequestDialog kind={kind} onClose={() => setKind(null)} />
    </div>
  );
}
