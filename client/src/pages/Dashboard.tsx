import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet, Users, TrendingUp, TrendingDown, Inbox, CheckCircle2, Circle, ArrowRight,
  ShieldCheck, AlertTriangle, Info, ShieldAlert, Scale,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useBooks } from '@/stores/books.store';
import { useActingUser, useAlerts, useLedger, useReconciliation } from '@/lib/data/hooks';
import { fmtShort, fmtUSD, toUSD } from '@/lib/data/money';
import { profitAndLoss, trialBalance } from '@/lib/data/ledger';
import { daysAgo, isoDay } from '@/lib/data/seed';
import type { Category } from '@/lib/data/types';
import { CATEGORY_LABEL } from '@/lib/data/labels';


function greeting(tr: (en: string, ar: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return tr('Good morning', 'صباح الخير');
  if (h < 18) return tr('Good afternoon', 'مساء الخير');
  return tr('Good evening', 'مساء الخير');
}

function BreakdownList({ items, total }: { items: { key: Category; value: number }[]; total: number }) {
  const { tr } = useTranslation();
  return (
    <div className="space-y-3">
      {items.map(({ key, value }) => {
        const pct = total > 0 ? Math.max(2, Math.round((Math.max(0, value) / total) * 100)) : 0;
        const label = CATEGORY_LABEL[key];
        return (
          <Link key={key} to={`/chart-of-accounts?cat=${key}`} className="block rounded-xl p-2 -m-2 transition-colors hover:bg-accent/40">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2 font-medium">
                <span className={cn('h-2.5 w-2.5 rounded-full', label.color)} />
                {tr(label.en, label.ar)}
              </span>
              <span className="font-mono font-semibold tabular-nums">{fmtUSD(value)}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', label.color)} style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { tr, lang, nameOf } = useTranslation();
  const navigate = useNavigate();
  const me = useActingUser();
  const employee = useBooks((s) => s.employees.find((e) => e.name === me.name));
  const brokerName = useBooks((s) => s.general.brokerName);
  const requests = useBooks((s) => s.requests);
  const clients = useBooks((s) => s.clients);
  const closedThrough = useBooks((s) => s.closedThrough);
  const { cat, cash, accounts, entries, usd, rates, unbalanced } = useLedger();
  const recon = useReconciliation();
  const alerts = useAlerts();

  const today = isoDay(new Date());
  const monthStart = today.slice(0, 8) + '01';
  const month = useMemo(() => profitAndLoss(accounts, entries, monthStart, today), [accounts, entries, monthStart, today]);
  const tb = useMemo(() => trialBalance(accounts, usd), [accounts, usd]);

  const pending = requests.filter((r) => r.status === 'pending');
  const confirmed = requests.filter((r) => r.status === 'confirmed');
  const executed = requests.filter((r) => r.status === 'executed');
  const yesterday = daysAgo(1);
  const dayIsClosed = closedThrough >= yesterday;

  const todo = [
    {
      done: pending.length === 0,
      text: pending.length
        ? tr(pending.length === 1 ? '1 money request needs an OK' : `${pending.length} money requests need an OK`, `${pending.length} من طلبات المال تحتاج موافقة`)
        : tr('No requests are waiting for an OK', 'لا توجد طلبات تنتظر الموافقة'),
      action: tr('Review', 'راجع'), to: '/operations?tab=pending',
    },
    {
      done: confirmed.length === 0,
      text: confirmed.length
        ? tr(confirmed.length === 1 ? '1 request has an OK. Send the money.' : `${confirmed.length} requests have an OK. Send the money.`, `${confirmed.length} طلبات تمت الموافقة عليها. أرسل المال.`)
        : tr('No money is waiting to be sent', 'لا يوجد مال ينتظر الإرسال'),
      action: tr('Send', 'أرسل'), to: '/operations?tab=confirmed',
    },
    {
      done: executed.length === 0,
      text: executed.length
        ? tr(executed.length === 1 ? '1 request was sent. Write it in the books.' : `${executed.length} requests were sent. Write them in the books.`, `${executed.length} طلبات أُرسلت. سجّلها في الدفاتر.`)
        : tr('Everything sent is written in the books', 'كل ما أُرسل مسجّل في الدفاتر'),
      action: tr('Write', 'سجّل'), to: '/operations?tab=executed',
    },
    {
      done: recon.toCheck === 0,
      text: recon.toCheck
        ? tr(recon.toCheck === 1 ? '1 client: MT5 and the books do not match' : `${recon.toCheck} clients: MT5 and the books do not match`, `${recon.toCheck} زبائن: MT5 والدفاتر غير متطابقة`)
        : tr('MT5 and your books match', 'MT5 ودفاترك متطابقة'),
      action: tr('Check', 'افحص'), to: '/reconciliation',
    },
    {
      done: dayIsClosed,
      text: dayIsClosed
        ? tr(`Every day up to ${closedThrough} is closed`, `كل الأيام حتى ${closedThrough} مغلقة`)
        : tr(`Days after ${closedThrough} are still open`, `الأيام بعد ${closedThrough} ما زالت مفتوحة`),
      action: tr('Close', 'أغلق'), to: '/eod',
    },
  ];
  const doneCount = todo.filter((x) => x.done).length;

  // Money in and out over the last 14 days (USD)
  const flow = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => daysAgo(13 - i));
    return days.map((d) => {
      let moneyIn = 0; let moneyOut = 0;
      for (const r of requests) {
        if (r.status !== 'voucher' || r.date !== d) continue;
        const v = r.lines.reduce((s, l) => s + toUSD(l.amount, l.currency, rates), 0);
        if (r.type === 'deposit' || r.type === 'ib_deposit') moneyIn += v;
        else if (r.type === 'withdrawal' || r.type === 'ib_withdrawal' || r.type === 'expense') moneyOut += v;
      }
      return { day: d.slice(5), in: Math.round(moneyIn), out: Math.round(moneyOut) };
    });
  }, [requests, rates]);

  const ownItems = (['funds', 'banks', 'suppliers', 'staff', 'fixed'] as Category[]).map((k) => ({ key: k, value: cat[k] }));
  const oweItems = (['clients', 'ibs', 'debts'] as Category[]).map((k) => ({ key: k, value: cat[k] }));
  const ownTotal = ownItems.reduce((s, i) => s + Math.max(0, i.value), 0);
  const oweTotal = oweItems.reduce((s, i) => s + Math.max(0, i.value), 0);
  const balanced = unbalanced === 0 && Math.abs(tb.difference) < 0.05;
  const cashBoxes = accounts.filter((a) => a.category === 'funds' && a.active).length;
  const banks = accounts.filter((a) => a.category === 'banks' && a.active).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting(tr)}، ${(employee ? nameOf(employee) : me.name).split(' ')[0]}`.replace('،', lang === 'ar' ? '،' : ',')}
        subtitle={tr(`Here is how ${brokerName} is doing today.`, `هذا حال ${brokerName} اليوم.`)}
        hint={
          <PageHint id="home-v2" title={tr('This is your home page', 'هذه صفحتك الرئيسية')}>
            {tr(
              'The four boxes show the most important numbers. Below them is your to-do list for today. Click anything to see more.',
              'المربعات الأربعة تعرض أهم الأرقام. وتحتها قائمة مهامك لليوم. اضغط على أي شيء لترى المزيد.',
            )}
          </PageHint>
        }
        actions={
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold',
            balanced ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive',
          )}>
            {balanced ? <ShieldCheck className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
            {balanced ? tr('Your books are balanced', 'دفاترك متوازنة') : tr('Your books are not balanced', 'دفاترك غير متوازنة')}
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={tr('Money you have', 'المال الذي لديك')}
          value={fmtShort(cash)}
          icon={Wallet}
          accent="blue"
          deltaLabel={tr(`In ${cashBoxes} cash boxes and ${banks} banks`, `في ${cashBoxes} صناديق و${banks} بنوك`)}
          onClick={() => navigate('/treasury')}
        />
        <StatCard
          label={tr("Clients' money with you", 'أموال الزبائن لديك')}
          value={fmtShort(cat.clients)}
          icon={Users}
          accent="violet"
          deltaLabel={tr(`${clients.filter((c) => c.active).length} clients`, `${clients.filter((c) => c.active).length} زبونًا`)}
          onClick={() => navigate('/clients')}
        />
        <StatCard
          label={tr('Profit this month', 'الربح هذا الشهر')}
          value={fmtShort(month.profit)}
          icon={month.profit >= 0 ? TrendingUp : TrendingDown}
          accent={month.profit >= 0 ? 'green' : 'pink'}
          deltaLabel={tr(`Earned ${fmtShort(month.totalIncome)} · spent ${fmtShort(month.totalCosts)}`, `كسبت ${fmtShort(month.totalIncome)} · صرفت ${fmtShort(month.totalCosts)}`)}
          onClick={() => navigate('/reports')}
        />
        <StatCard
          label={tr('Waiting for you', 'ينتظرك')}
          value={pending.length + confirmed.length + executed.length}
          icon={Inbox}
          accent="amber"
          deltaLabel={tr('Money requests to finish', 'طلبات مال يجب إنهاؤها')}
          onClick={() => navigate('/operations')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title={tr('Your to-do list for today', 'قائمة مهامك لليوم')}
          description={tr(`${doneCount} of ${todo.length} done`, `تم ${doneCount} من ${todo.length}`)}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border/40">
            {todo.map((item) => (
              <li key={item.to} className="flex items-center gap-3 px-6 py-3.5">
                {item.done
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  : <Circle className="h-5 w-5 shrink-0 text-warning" />}
                <span className={cn('flex-1 text-[14px]', item.done && 'text-muted-foreground')}>{item.text}</span>
                {!item.done && (
                  <Button size="sm" variant="outline" onClick={() => navigate(item.to)} className="gap-1">
                    {item.action}
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title={tr('Things to look at', 'أشياء تحتاج انتباهك')}
          description={alerts.length ? tr(`${alerts.length} things`, `${alerts.length} أشياء`) : undefined}
          bodyClassName="p-0"
        >
          {alerts.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
              {tr('All good. Nothing needs you right now.', 'كل شيء جيد. لا شيء يحتاجك الآن.')}
            </div>
          ) : (
            <ul className="max-h-[300px] divide-y divide-border/40 overflow-y-auto">
              {alerts.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 px-5 py-3">
                  {a.severity === 'critical' ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    : a.severity === 'warning' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    : <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{tr(a.title, a.titleAr)}</p>
                    <p className="text-[12px] text-muted-foreground">{tr(a.body, a.bodyAr)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={tr('What you own', 'ما تملكه')}
          description={tr('Money and things that belong to the company.', 'المال والأشياء التي تملكها الشركة.')}
          action={<span className="font-mono text-base font-bold">{fmtUSD(ownTotal)}</span>}
        >
          <BreakdownList items={ownItems} total={ownTotal} />
        </SectionCard>
        <SectionCard
          title={tr('What you owe', 'ما عليك')}
          description={tr('Money that belongs to clients, partners and others.', 'مال يخص الزبائن والشركاء وغيرهم.')}
          action={<span className="font-mono text-base font-bold">{fmtUSD(oweTotal)}</span>}
        >
          <BreakdownList items={oweItems} total={oweTotal} />
          <p className="mt-5 rounded-xl bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
            {tr(
              `What you own minus what you owe is ${fmtUSD(ownTotal - oweTotal)}. That is the owners' share of the company.`,
              `ما تملكه ناقص ما عليك يساوي ${fmtUSD(ownTotal - oweTotal)}. وهذا نصيب المالكين في الشركة.`,
            )}
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title={tr('Money in and out — last 14 days', 'المال الداخل والخارج — آخر 14 يومًا')}
        description={tr('Green is money clients added. Red is money that went out.', 'الأخضر مال أضافه الزبائن. والأحمر مال خرج.')}
      >
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtShort(v)} />
              <Tooltip
                formatter={(v) => fmtUSD(Number(v))}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="in" name={lang === 'ar' ? 'داخل' : 'In'} fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="out" name={lang === 'ar' ? 'خارج' : 'Out'} fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
