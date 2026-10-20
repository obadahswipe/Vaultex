import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Lock, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { attempt } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useActingUser, useReconciliation } from '@/lib/data/hooks';
import { entryTotalsUSD } from '@/lib/data/ledger';
import { fmtUSD, round2 } from '@/lib/data/money';
import { isAccountant } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

function nextDay(d: string) {
  const x = new Date(d + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

export default function EOD() {
  const { tr } = useTranslation();
  const navigate = useNavigate();
  const me = useActingUser();
  const closedThrough = useBooks((s) => s.closedThrough);
  const requests = useBooks((s) => s.requests);
  const trades = useBooks((s) => s.trades);
  const posted = useBooks((s) => s.postedTradeIds);
  const clients = useBooks((s) => s.clients);
  const ibs = useBooks((s) => s.ibs);
  const entries = useBooks((s) => s.entries);
  const users = useBooks((s) => s.users);
  const closeDay = useBooks((s) => s.closeDay);
  const recon = useReconciliation();

  const today = new Date().toISOString().slice(0, 10);
  const day = nextDay(closedThrough);
  const canClose = day <= today;

  const plan = useMemo(() => {
    const postedSet = new Set(posted);
    const toBook = trades.filter((t) => t.status === 'closed' && !postedSet.has(t.id) && (t.closedAt ?? '').slice(0, 10) <= day);
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const ibById = new Map(ibs.map((i) => [i.id, i]));
    // Only in-house trades change the company's result; a trading partner covers the rest.
    const clientResult = round2(toBook.filter((t) => t.book === 'B').reduce((s, t) => s + t.profit, 0));
    const fees = round2(toBook.reduce((s, t) => s + t.commission, 0));
    const partnerPay = round2(toBook.reduce((s, t) => {
      const ib = ibById.get(clientById.get(t.clientId)?.ibParentId ?? '');
      return s + (ib ? t.lots * ib.commissionRate : 0);
    }, 0));
    const blocking = requests.filter((r) => r.date <= day && (r.status === 'confirmed' || r.status === 'executed'));
    const pending = requests.filter((r) => r.date <= day && r.status === 'pending');
    return { toBook, clientResult, fees, partnerPay, blocking, pending };
  }, [trades, posted, clients, ibs, requests, day]);

  const checks = [
    {
      state: plan.blocking.length ? 'stop' : 'ok',
      text: plan.blocking.length
        ? tr(plan.blocking.length === 1 ? '1 request got an OK but is not finished. Finish it first.' : `${plan.blocking.length} requests got an OK but are not finished. Finish them first.`, `${plan.blocking.length} طلبات تمت الموافقة عليها ولم تكتمل. أكملها أولًا.`)
        : tr('Every request with an OK is finished.', 'كل طلب تمت الموافقة عليه مكتمل.'),
      action: plan.blocking.length ? () => navigate('/operations?tab=confirmed') : undefined,
    },
    {
      state: plan.pending.length ? 'warn' : 'ok',
      text: plan.pending.length
        ? tr(plan.pending.length === 1 ? '1 request still needs an OK. That is fine — it stays open for the next day.' : `${plan.pending.length} requests still need an OK. That is fine — they stay open for the next day.`, `${plan.pending.length} طلبات ما زالت تحتاج موافقة. لا بأس — تبقى مفتوحة لليوم التالي.`)
        : tr('No request is waiting for an OK.', 'لا يوجد طلب ينتظر الموافقة.'),
      action: plan.pending.length ? () => navigate('/operations?tab=pending') : undefined,
    },
    {
      state: recon.toCheck ? 'warn' : 'ok',
      text: recon.toCheck
        ? tr(recon.toCheck === 1 ? '1 client has MT5 numbers nobody can explain. You can still close, but please check it.' : `${recon.toCheck} clients have MT5 numbers nobody can explain. You can still close, but please check them.`, `${recon.toCheck} زبائن لديهم أرقام في MT5 بلا تفسير. يمكنك الإغلاق، لكن افحصها من فضلك.`)
        : tr('MT5 and your books match.', 'MT5 ودفاترك متطابقة.'),
      action: recon.toCheck ? () => navigate('/reconciliation') : undefined,
    },
  ] as const;

  const history = useMemo(() => {
    const byDay = new Map<string, { result: number; pay: number; by: string }>();
    for (const e of entries) {
      if (!e.ref?.startsWith('eod-')) continue;
      const d = e.ref.slice(4);
      const r = byDay.get(d) ?? { result: 0, pay: 0, by: e.createdBy };
      // What the company earned from trading: spread, fees and in-house results.
      if (e.kind === 'trade_pnl') r.result += e.lines.filter((l) => l.accountCode.startsWith('41')).reduce((s, l) => s + (l.credit - l.debit) * l.rate, 0);
      if (e.kind === 'ib_commission') r.pay += entryTotalsUSD(e).debit;
      byDay.set(d, r);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);
  }, [entries]);

  const doClose = () => {
    if (!window.confirm(tr(`Close ${day}? After this, nobody can change that day.`, `هل تريد إغلاق ${day}؟ بعد ذلك لن يستطيع أحد تغيير ذلك اليوم.`))) return;
    attempt(() => {
      const r = closeDay(day, me.email);
      void r;
    }, tr(`${day} is closed and locked`, `تم إغلاق ${day} وقفله`));
  };

  const who = (email: string) => users.find((u) => u.email === email)?.name ?? (email === 'system' ? tr('Vaultex', 'فولتكس') : email);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Close the day', 'إغلاق اليوم')}
        subtitle={tr('At the end of each day, Vaultex books the trading results and partner pay, then locks the day.', 'في نهاية كل يوم، يسجّل فولتكس نتائج التداول وأجور الشركاء، ثم يقفل اليوم.')}
        hint={
          <PageHint id="eod-v2" title={tr('Why lock a day?', 'لماذا نقفل اليوم؟')}>
            {tr('A locked day can never be changed. This stops mistakes and fraud, and it is what auditors expect. If you find a mistake later, fix it with a new entry today.', 'اليوم المقفل لا يمكن تغييره أبدًا. هذا يمنع الأخطاء والاحتيال، وهو ما يتوقعه المدققون. إذا وجدت خطأً لاحقًا، صحّحه بقيد جديد اليوم.')}
          </PageHint>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title={canClose ? tr(`Next day to close: ${day}`, `اليوم التالي للإغلاق: ${day}`) : tr('All days are closed', 'كل الأيام مغلقة')} description={tr(`Closed up to ${closedThrough}.`, `مغلق حتى ${closedThrough}.`)}>
          {canClose ? (
            <div className="space-y-5">
              <ul className="space-y-3">
                {checks.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {c.state === 'ok' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />}
                    {c.state === 'warn' && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
                    {c.state === 'stop' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
                    <span className="flex-1 text-[14px]">{c.text}</span>
                    {c.action && <Button size="sm" variant="outline" onClick={c.action}>{tr('Open', 'افتح')}</Button>}
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-[13px] font-semibold">{tr('What will be written in the books', 'ما سيُسجّل في الدفاتر')}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div><p className="text-[11px] text-muted-foreground">{tr('Trades to book', 'صفقات للتسجيل')}</p><p className="text-lg font-bold">{plan.toBook.length}</p></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">{plan.clientResult > 0 ? tr('Clients won (you pay)', 'ربح الزبائن (تدفعه أنت)') : tr('Clients lost (you earn)', 'خسر الزبائن (تكسبه أنت)')}</p>
                    <p className={cn('font-mono text-lg font-bold', plan.clientResult > 0 ? 'text-destructive' : 'text-success')} dir="ltr">{fmtUSD(Math.abs(plan.clientResult), 2)}</p>
                  </div>
                  <div><p className="text-[11px] text-muted-foreground">{tr('Partner pay', 'أجور الشركاء')}</p><p className="font-mono text-lg font-bold" dir="ltr">{fmtUSD(plan.partnerPay, 2)}</p></div>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">{tr(`Clients also paid ${fmtUSD(plan.fees, 2)} in trading fees.`, `ودفع الزبائن أيضًا ${fmtUSD(plan.fees, 2)} رسوم تداول.`)}</p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-muted-foreground">
                  {!isAccountant(me.role) ? tr('Only an accountant or a manager can close the day.', 'المحاسب أو المدير فقط يستطيع إغلاق اليوم.') : ''}
                </p>
                <Button variant="gradient" size="lg" className="gap-2" disabled={!!plan.blocking.length || !isAccountant(me.role)} onClick={doClose}>
                  <Lock className="h-4 w-4" />{tr(`Close and lock ${day}`, `أغلق واقفل ${day}`)}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-success" />
              <p className="font-semibold">{tr('You are up to date.', 'كل شيء محدّث.')}</p>
              <p className="text-[13px] text-muted-foreground">{tr('Come back at the end of today.', 'عد في نهاية اليوم.')}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title={tr('How it works', 'كيف يعمل')}>
          <ol className="space-y-3 text-[13px]">
            {[
              tr('Check every request with an OK is finished.', 'تأكد أن كل طلب تمت الموافقة عليه مكتمل.'),
              tr('Vaultex books the day’s closed trades: client wins and losses, and fees.', 'فولتكس يسجّل صفقات اليوم المغلقة: أرباح الزبائن وخسائرهم والرسوم.'),
              tr('Vaultex books partner pay for the lots their clients traded.', 'فولتكس يسجّل أجور الشركاء عن اللوتات التي تداولها زبائنهم.'),
              tr('The day is locked. Nobody can change it.', 'يُقفل اليوم. ولا يستطيع أحد تغييره.'),
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      <SectionCard padded={false} title={tr('Days closed lately', 'الأيام المغلقة مؤخرًا')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Day', 'اليوم')}</TableHead>
              <TableHead className="text-end">{tr('Company earned from trading', 'ربح الشركة من التداول')}</TableHead>
              <TableHead className="text-end">{tr('Partner pay', 'أجور الشركاء')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tr('By', 'بواسطة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map(([d, r]) => (
              <TableRow key={d}>
                <TableCell className="font-medium"><Lock className="me-1.5 inline h-3 w-3 text-muted-foreground" />{d}</TableCell>
                <TableCell className={cn('text-end font-mono', r.result >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtUSD(r.result, 2)}</TableCell>
                <TableCell className="text-end font-mono" dir="ltr">{fmtUSD(r.pay, 2)}</TableCell>
                <TableCell className="hidden text-[13px] text-muted-foreground sm:table-cell">{who(r.by)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
