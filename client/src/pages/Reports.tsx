import { useMemo, useState } from 'react';
import { Download, TrendingUp, TrendingDown, Scale, Printer } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Segmented } from '@/components/shared/form';
import { useLedger } from '@/lib/data/hooks';
import { profitAndLoss, trialBalance } from '@/lib/data/ledger';
import { CATEGORY_LABEL } from '@/lib/data/labels';
import { fmtUSD } from '@/lib/data/money';
import { daysAgo } from '@/lib/data/seed';
import { downloadCsv } from '@/lib/csv';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/data/types';

type Tab = 'profit' | 'sheet' | 'trial';
type Period = 'month' | 'last' | '30d' | 'year';

function periodRange(p: Period): [string, string] {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (p === 'month') return [today.slice(0, 8) + '01', today];
  if (p === '30d') return [daysAgo(30), today];
  if (p === 'year') return [today.slice(0, 4) + '-01-01', today];
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

function Line({ label, value, bold, tone }: { label: string; value: number; bold?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 py-2.5 text-[14px]', bold && 'bg-muted/40 font-bold')}>
      <span>{label}</span>
      <span className={cn('font-mono', tone === 'good' && 'text-success', tone === 'bad' && 'text-destructive')} dir="ltr">{fmtUSD(value, 2)}</span>
    </div>
  );
}

export default function Reports() {
  const { tr, nameOf } = useTranslation();
  const { accounts, entries, cat, sheet, usd } = useLedger();
  const [tab, setTab] = useState<Tab>('profit');
  const [period, setPeriod] = useState<Period>('month');
  const [from, to] = periodRange(period);
  const pnl = useMemo(() => profitAndLoss(accounts, entries, from, to), [accounts, entries, from, to]);
  const tb = useMemo(() => trialBalance(accounts, usd), [accounts, usd]);

  const own: Category[] = ['funds', 'banks', 'suppliers', 'staff', 'fixed'];
  const owe: Category[] = ['clients', 'ibs', 'debts'];

  const exportIt = () => {
    if (tab === 'profit') {
      downloadCsv(`vaultex-profit-${from}-${to}.csv`, [
        ...pnl.income.map((l) => ({ group: 'Earned', account: l.code, name: l.name, usd: l.amount })),
        ...pnl.costs.map((l) => ({ group: 'Spent', account: l.code, name: l.name, usd: -l.amount })),
        { group: 'Profit', account: '', name: '', usd: pnl.profit },
      ]);
    } else if (tab === 'sheet') {
      downloadCsv('vaultex-own-and-owe.csv', [
        ...own.map((c) => ({ side: 'Own', group: CATEGORY_LABEL[c].en, usd: cat[c] })),
        ...owe.map((c) => ({ side: 'Owe', group: CATEGORY_LABEL[c].en, usd: cat[c] })),
        { side: 'Owners', group: "Owners' money", usd: sheet.owners },
        { side: 'Owners', group: 'Profit not shared yet', usd: sheet.profit },
        { side: 'Owners', group: 'Currency effect', usd: sheet.currencyEffect },
      ]);
    } else {
      downloadCsv('vaultex-trial-balance.csv', tb.rows.map((r) => ({ account: r.code, name: r.name, debit: r.debit, credit: r.credit })));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Profit and reports', 'الأرباح والتقارير')}
        subtitle={tr('Did you make money? What do you own and owe? All in US dollars.', 'هل ربحت؟ ماذا تملك وماذا عليك؟ كله بالدولار الأمريكي.')}
        hint={
          <PageHint id="reports-v2" title={tr('Three reports', 'ثلاثة تقارير')}>
            {tr('"Did we make money?" is your profit report. "What we own and owe" is your balance sheet. "Trial balance" is the list your accountant or auditor will ask for.', '"هل ربحنا؟" هو تقرير الأرباح. "ما نملكه وما علينا" هو الميزانية. و"ميزان المراجعة" هو القائمة التي سيطلبها محاسبك أو مدققك.')}
          </PageHint>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" />{tr('Print', 'طباعة')}</Button>
            <Button variant="outline" className="gap-1.5" onClick={exportIt}><Download className="h-4 w-4" />{tr('Download (Excel)', 'تنزيل (إكسل)')}</Button>
          </div>
        }
      />

      <Segmented<Tab> value={tab} onChange={setTab} options={[
        { value: 'profit', label: tr('Did we make money?', 'هل ربحنا؟') },
        { value: 'sheet', label: tr('What we own and owe', 'ما نملكه وما علينا') },
        { value: 'trial', label: tr('Trial balance', 'ميزان المراجعة') },
      ]} />

      {tab === 'profit' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<Period> value={period} onChange={setPeriod} options={[
              { value: 'month', label: tr('This month', 'هذا الشهر') },
              { value: 'last', label: tr('Last month', 'الشهر الماضي') },
              { value: '30d', label: tr('Last 30 days', 'آخر 30 يومًا') },
              { value: 'year', label: tr('This year', 'هذه السنة') },
            ]} />
            <span className="text-[13px] text-muted-foreground">{from} → {to}</span>
          </div>

          <div className={cn('flex items-center gap-4 rounded-2xl border p-6', pnl.profit >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}>
            {pnl.profit >= 0 ? <TrendingUp className="h-10 w-10 text-success" /> : <TrendingDown className="h-10 w-10 text-destructive" />}
            <div>
              <p className="text-[14px] font-medium">{pnl.profit >= 0 ? tr('Yes! You made a profit.', 'نعم! حققت ربحًا.') : tr('No. You spent more than you earned.', 'لا. صرفت أكثر مما كسبت.')}</p>
              <p className={cn('font-mono text-3xl font-extrabold', pnl.profit >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtUSD(pnl.profit, 2)}</p>
              <p className="text-[13px] text-muted-foreground">{tr(`Earned ${fmtUSD(pnl.totalIncome)} − spent ${fmtUSD(pnl.totalCosts)}`, `كسبت ${fmtUSD(pnl.totalIncome)} − صرفت ${fmtUSD(pnl.totalCosts)}`)}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard padded={false} title={tr('Money earned', 'المال المكتسب')} action={<span className="font-mono font-bold text-success">{fmtUSD(pnl.totalIncome, 2)}</span>}>
              <div className="divide-y divide-border/40">
                {pnl.income.map((l) => <Line key={l.code} label={nameOf(l)} value={l.amount} tone={l.amount < 0 ? 'bad' : undefined} />)}
                {pnl.income.length === 0 && <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">{tr('Nothing earned in this time.', 'لا دخل في هذه الفترة.')}</p>}
              </div>
            </SectionCard>
            <SectionCard padded={false} title={tr('Money spent', 'المال المصروف')} action={<span className="font-mono font-bold text-destructive">{fmtUSD(pnl.totalCosts, 2)}</span>}>
              <div className="divide-y divide-border/40">
                {pnl.costs.map((l) => <Line key={l.code} label={nameOf(l)} value={l.amount} />)}
                {pnl.costs.length === 0 && <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">{tr('Nothing spent in this time.', 'لا مصاريف في هذه الفترة.')}</p>}
              </div>
            </SectionCard>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {tr('"Client trading results" is what you win or lose when you keep client trades in-house. When clients lose, you earn.', '"نتائج تداول الزبائن" هي ما تربحه أو تخسره عندما تُبقي صفقات الزبائن داخليًا. عندما يخسر الزبائن، تربح أنت.')}
          </p>
        </>
      )}

      {tab === 'sheet' && (
        <>
          <div className="rounded-2xl bg-primary/5 p-5 text-center text-[15px]">
            <span className="font-semibold">{tr('What you own', 'ما تملكه')} {fmtUSD(sheet.own)}</span>
            <span className="mx-2">=</span>
            <span className="font-semibold">{tr('What you owe', 'ما عليك')} {fmtUSD(sheet.owe)}</span>
            <span className="mx-2">+</span>
            <span className="font-semibold">{tr("Owners' share", 'حصة المالكين')} {fmtUSD(sheet.owners + sheet.profit + sheet.currencyEffect)}</span>
            <p className={cn('mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold', sheet.balanced ? 'text-success' : 'text-destructive')}>
              <Scale className="h-4 w-4" />{sheet.balanced ? tr('Both sides are equal ✓', 'الجانبان متساويان ✓') : tr('The sides are not equal', 'الجانبان غير متساويين')}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard padded={false} title={tr('What you own', 'ما تملكه')} action={<span className="font-mono font-bold">{fmtUSD(sheet.own, 2)}</span>}>
              <div className="divide-y divide-border/40">{own.map((c) => <Line key={c} label={tr(CATEGORY_LABEL[c].en, CATEGORY_LABEL[c].ar)} value={cat[c]} />)}</div>
            </SectionCard>
            <SectionCard padded={false} title={tr('What you owe, and the owners’ share', 'ما عليك، وحصة المالكين')} action={<span className="font-mono font-bold">{fmtUSD(sheet.owe + sheet.owners + sheet.profit + sheet.currencyEffect, 2)}</span>}>
              <div className="divide-y divide-border/40">
                {owe.map((c) => <Line key={c} label={tr(CATEGORY_LABEL[c].en, CATEGORY_LABEL[c].ar)} value={cat[c]} />)}
                <Line label={tr('Total you owe', 'مجموع ما عليك')} value={sheet.owe} bold />
                <Line label={tr("Owners' money and past profit", 'أموال المالكين والأرباح السابقة')} value={sheet.owners} />
                <Line label={tr('Profit not shared yet', 'أرباح لم تُوزّع بعد')} value={sheet.profit} tone={sheet.profit >= 0 ? 'good' : 'bad'} />
                <Line label={tr('Currency effect (rates moved)', 'أثر تغيّر أسعار العملات')} value={sheet.currencyEffect} />
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {tab === 'trial' && (
        <SectionCard padded={false} title={tr('Trial balance (in USD at today’s rates)', 'ميزان المراجعة (بالدولار حسب سعر اليوم)')} description={tr('Every account with a balance. The two totals must be equal.', 'كل حساب له رصيد. ويجب أن يتساوى المجموعان.')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{tr('No.', 'رقم')}</TableHead>
                <TableHead>{tr('Account', 'الحساب')}</TableHead>
                <TableHead className="text-end">{tr('Debit', 'مدين')}</TableHead>
                <TableHead className="text-end">{tr('Credit', 'دائن')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tb.rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.code}</TableCell>
                  <TableCell>{nameOf(r)}</TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{r.debit ? fmtUSD(r.debit, 2) : ''}</TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{r.credit ? fmtUSD(r.credit, 2) : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-bold">
                  {tr('Totals', 'المجاميع')}
                  <span className={cn('ms-2 text-[12px]', Math.abs(tb.difference) < 0.05 ? 'text-success' : 'text-destructive')}>
                    {Math.abs(tb.difference) < 0.05 ? tr('equal ✓', 'متساويان ✓') : tr(`off by ${fmtUSD(tb.difference, 2)}`, `فرق ${fmtUSD(tb.difference, 2)}`)}
                  </span>
                </TableCell>
                <TableCell className="text-end font-mono font-bold" dir="ltr">{fmtUSD(tb.totalDebit, 2)}</TableCell>
                <TableCell className="text-end font-mono font-bold" dir="ltr">{fmtUSD(tb.totalCredit, 2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </SectionCard>
      )}
    </div>
  );
}
