import { Fragment, useMemo, useState } from 'react';
import { HandCoins, Wallet, BarChart3, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Segmented } from '@/components/shared/form';
import { NewRequestDialog } from '@/components/operations/NewRequestDialog';
import { usePartnerStats } from '@/lib/data/partners';
import { useBooks } from '@/stores/books.store';
import { fmtUSD, round2 } from '@/lib/data/money';
import { daysAgo } from '@/lib/data/seed';
import { useTranslation } from '@/lib/i18n/useTranslation';

type Period = 'month' | '30d' | 'today';

export default function IBCommissions() {
  const { tr, nameOf } = useTranslation();
  const clients = useBooks((s) => s.clients);
  const trades = useBooks((s) => s.trades);
  const [period, setPeriod] = useState<Period>('month');
  const [payFor, setPayFor] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const from = period === 'month' ? today.slice(0, 8) + '01' : period === '30d' ? daysAgo(30) : today;
  const rows = usePartnerStats(from, today);

  const totals = useMemo(() => ({
    lots: round2(rows.reduce((s, r) => s + r.lots, 0)),
    earned: round2(rows.reduce((s, r) => s + r.earned, 0)),
    paid: round2(rows.reduce((s, r) => s + r.paid, 0)),
    owed: round2(rows.reduce((s, r) => s + r.owed, 0)),
    pending: round2(rows.reduce((s, r) => s + r.pendingLots * r.ib.commissionRate, 0)),
  }), [rows]);

  const perClient = (ibId: string) => {
    const mine = clients.filter((c) => c.ibParentId === ibId);
    return mine.map((c) => {
      const t = trades.filter((x) => x.clientId === c.id && x.status === 'closed' && (x.closedAt ?? '').slice(0, 10) >= from);
      return { c, lots: round2(t.reduce((s, x) => s + x.lots, 0)), trades: t.length };
    }).sort((a, b) => b.lots - a.lots);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Partner pay', 'أجور الشركاء')}
        subtitle={tr('How much each partner earned, how much you paid, and what you still owe.', 'كم ربح كل شريك، وكم دفعت له، وكم بقي عليك.')}
        hint={
          <PageHint id="ibpay-v2" title={tr('How is partner pay worked out?', 'كيف تُحسب أجور الشركاء؟')}>
            {tr('Lots traded by their clients × the partner’s pay per lot. It is added to the books every time you close the day.', 'اللوتات التي تداولها زبائنه × أجر الشريك لكل لوت. ويُضاف إلى الدفاتر كل مرة تغلق فيها اليوم.')}
          </PageHint>
        }
        actions={
          <Segmented<Period> value={period} onChange={setPeriod} options={[
            { value: 'today', label: tr('Today', 'اليوم') },
            { value: 'month', label: tr('This month', 'هذا الشهر') },
            { value: '30d', label: tr('Last 30 days', 'آخر 30 يومًا') },
          ]} />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Lots traded', 'اللوتات المتداولة')} value={totals.lots} icon={BarChart3} accent="blue" deltaLabel={tr('By clients partners brought', 'من زبائن أحضرهم الشركاء')} />
        <StatCard label={tr('Pay earned', 'الأجر المكتسب')} value={fmtUSD(totals.earned, 2)} icon={HandCoins} accent="green" deltaLabel={tr('Already in the books', 'مسجّل في الدفاتر')} />
        <StatCard label={tr('Not booked yet', 'لم يُسجّل بعد')} value={fmtUSD(totals.pending, 2)} icon={Clock} accent="amber" deltaLabel={tr('Booked when you close the day', 'يُسجّل عند إغلاق اليوم')} />
        <StatCard label={tr('You owe partners', 'تدين للشركاء')} value={fmtUSD(totals.owed, 2)} icon={Wallet} accent="violet" deltaLabel={tr(`Paid ${fmtUSD(totals.paid)} in this period`, `دفعت ${fmtUSD(totals.paid)} في هذه الفترة`)} />
      </div>

      <SectionCard padded={false} title={tr('Each partner', 'كل شريك')} description={tr('Click a partner to see their clients.', 'اضغط على شريك لترى زبائنه.')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Partner', 'الشريك')}</TableHead>
              <TableHead className="text-end">{tr('Lots', 'اللوتات')}</TableHead>
              <TableHead className="hidden text-end sm:table-cell">{tr('Pay per lot', 'لكل لوت')}</TableHead>
              <TableHead className="text-end">{tr('Earned', 'ربح')}</TableHead>
              <TableHead className="hidden text-end md:table-cell">{tr('Paid', 'دُفع')}</TableHead>
              <TableHead className="text-end">{tr('Still owed', 'متبقٍ')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <Fragment key={r.ib.id}>
                <TableRow className="cursor-pointer" onClick={() => setOpen(open === r.ib.id ? null : r.ib.id)}>
                  <TableCell><p className="font-medium">{nameOf(r.ib)}</p><p className="text-[11px] text-muted-foreground">{tr(`${r.clients} clients`, `${r.clients} زبائن`)}</p></TableCell>
                  <TableCell className="text-end tabular-nums">{r.lots}</TableCell>
                  <TableCell className="hidden text-end tabular-nums sm:table-cell">{fmtUSD(r.ib.commissionRate, 2)}</TableCell>
                  <TableCell className="text-end font-mono text-success">{fmtUSD(r.earned, 2)}</TableCell>
                  <TableCell className="hidden text-end font-mono md:table-cell">{fmtUSD(r.paid, 2)}</TableCell>
                  <TableCell className="text-end font-mono font-semibold">{fmtUSD(r.owed, 2)}</TableCell>
                  <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="outline" disabled={r.owed <= 0} onClick={() => setPayFor(r.ib.treeAccountCode)}>{tr('Pay', 'ادفع')}</Button>
                  </TableCell>
                </TableRow>
                {open === r.ib.id && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={7}>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {perClient(r.ib.id).map(({ c, lots, trades: n }) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-[13px]">
                            <span>{nameOf(c)}<span className="ms-1 text-[11px] text-muted-foreground">({tr(`${n} trades`, `${n} صفقات`)})</span></span>
                            <span className="font-mono">{lots} {tr('lots', 'لوت')} → {fmtUSD(lots * r.ib.commissionRate, 2)}</span>
                          </div>
                        ))}
                        {perClient(r.ib.id).length === 0 && <p className="text-[13px] text-muted-foreground">{tr('No clients yet.', 'لا زبائن بعد.')}</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">{tr('Total', 'المجموع')}</TableCell>
              <TableCell className="text-end font-semibold">{totals.lots}</TableCell>
              <TableCell className="hidden sm:table-cell" />
              <TableCell className="text-end font-mono font-semibold">{fmtUSD(totals.earned, 2)}</TableCell>
              <TableCell className="hidden text-end font-mono font-semibold md:table-cell">{fmtUSD(totals.paid, 2)}</TableCell>
              <TableCell className="text-end font-mono font-semibold">{fmtUSD(totals.owed, 2)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </SectionCard>

      <NewRequestDialog open={!!payFor} presetAccount={payFor ?? undefined} presetType="ib_withdrawal" onClose={() => setPayFor(null)} />
    </div>
  );
}
