import { useMemo, useState } from 'react';
import { RefreshCw, TrendingUp, Activity, BarChart3, Coins, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Segmented, attempt } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { fmtUSD, round2 } from '@/lib/data/money';
import { daysAgo } from '@/lib/data/seed';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

type View = 'open' | 'today' | 'closed';

export default function Trades() {
  const { tr, nameOf } = useTranslation();
  const trades = useBooks((s) => s.trades);
  const clients = useBooks((s) => s.clients);
  const refreshPrices = useBooks((s) => s.refreshPrices);
  const closeTrade = useBooks((s) => s.closeTrade);
  const [view, setView] = useState<View>('open');
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const open = trades.filter((t) => t.status === 'open');
  const closedToday = trades.filter((t) => t.status === 'closed' && (t.closedAt ?? '').slice(0, 10) === today);
  const monthStart = today.slice(0, 8) + '01';
  const closedMonth = trades.filter((t) => t.status === 'closed' && (t.closedAt ?? '').slice(0, 10) >= monthStart);
  const floating = round2(open.reduce((s, t) => s + t.profit, 0));
  const fees = round2(closedMonth.reduce((s, t) => s + t.commission, 0));

  const list = useMemo(() => {
    const base = view === 'open' ? trades.filter((t) => t.status === 'open')
      : view === 'today' ? trades.filter((t) => t.status === 'closed' && (t.closedAt ?? '').slice(0, 10) === today)
      : trades.filter((t) => t.status === 'closed' && (t.closedAt ?? '') >= daysAgo(30));
    const q = search.trim().toLowerCase();
    return base
      .filter((t) => !q || t.symbol.toLowerCase().includes(q) || String(t.ticket).includes(q) || nameOf(clientById.get(t.clientId)).toLowerCase().includes(q))
      .sort((a, b) => (b.closedAt ?? b.openedAt).localeCompare(a.closedAt ?? a.openedAt));
  }, [view, trades, today, search, clientById, nameOf]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Trades', 'الصفقات')}
        subtitle={tr('What your clients are buying and selling on MT5.', 'ما يشتريه زبائنك وما يبيعونه على MT5.')}
        hint={
          <PageHint id="trades-v2" title={tr('How to read this page', 'كيف تقرأ هذه الصفحة')}>
            {tr('"Result" is the client’s win or loss. "Kept in-house" means your company takes the other side: if the client wins, you lose the same amount. "Sent to partner" means a trading partner takes that risk instead.', '"النتيجة" هي ربح الزبون أو خسارته. "داخلي" يعني أن شركتك تأخذ الطرف الآخر: إذا ربح الزبون تخسر أنت المبلغ نفسه. "مُرسلة للشريك" تعني أن شريك التداول يتحمل هذا الخطر بدلًا منك.')}
          </PageHint>
        }
        actions={<Button variant="outline" className="gap-1.5" onClick={refreshPrices}><RefreshCw className="h-4 w-4" />{tr('Update prices', 'حدّث الأسعار')}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Open trades', 'صفقات مفتوحة')} value={open.length} icon={Activity} accent="blue" deltaLabel={tr(`${round2(open.reduce((s, t) => s + t.lots, 0))} lots`, `${round2(open.reduce((s, t) => s + t.lots, 0))} لوت`)} />
        <StatCard label={tr('Clients win/lose now', 'ربح/خسارة الزبائن الآن')} value={fmtUSD(floating)} icon={TrendingUp} accent={floating > 0 ? 'pink' : 'green'} deltaLabel={floating > 0 ? tr('Clients are winning right now', 'الزبائن يربحون الآن') : tr('Clients are losing right now', 'الزبائن يخسرون الآن')} />
        <StatCard label={tr('Closed today', 'أُغلقت اليوم')} value={closedToday.length} icon={BarChart3} accent="violet" deltaLabel={tr('Booked when you close the day', 'تُسجّل عند إغلاق اليوم')} />
        <StatCard label={tr('Trading fees this month', 'رسوم التداول هذا الشهر')} value={fmtUSD(fees)} icon={Coins} accent="green" deltaLabel={tr('Paid by clients', 'دفعها الزبائن')} />
      </div>

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Segmented<View> value={view} onChange={setView} options={[
            { value: 'open', label: tr('Open now', 'مفتوحة الآن'), count: open.length },
            { value: 'today', label: tr('Closed today', 'أُغلقت اليوم'), count: closedToday.length },
            { value: 'closed', label: tr('Closed, last 30 days', 'مغلقة، آخر 30 يومًا') },
          ]} />
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search client, symbol or ticket…', 'ابحث عن زبون أو رمز أو رقم…')} className="ps-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Client', 'الزبون')}</TableHead>
              <TableHead>{tr('What', 'ماذا')}</TableHead>
              <TableHead className="text-end">{tr('Lots', 'لوت')}</TableHead>
              <TableHead className="hidden text-end md:table-cell">{tr('Price', 'السعر')}</TableHead>
              <TableHead className="text-end">{tr('Result', 'النتيجة')}</TableHead>
              <TableHead className="hidden lg:table-cell">{tr('Risk taken by', 'من يتحمل الخطر')}</TableHead>
              {view === 'open' && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.slice(0, 200).map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="font-medium">{nameOf(clientById.get(t.clientId))}</p>
                  <p className="text-[11px] text-muted-foreground">#{t.ticket} · {(t.closedAt ?? t.openedAt).slice(0, 16).replace('T', ' ')}</p>
                </TableCell>
                <TableCell>
                  <span className={cn('me-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold', t.side === 'buy' ? 'bg-emerald-500/12 text-emerald-600' : 'bg-red-500/12 text-red-600')}>
                    {t.side === 'buy' ? tr('BUY', 'شراء') : tr('SELL', 'بيع')}
                  </span>
                  <span className="font-mono text-[13px] font-semibold">{t.symbol}</span>
                </TableCell>
                <TableCell className="text-end tabular-nums">{t.lots}</TableCell>
                <TableCell className="hidden text-end font-mono text-[12px] md:table-cell" dir="ltr">{t.openPrice} → {t.closePrice ?? t.currentPrice}</TableCell>
                <TableCell className={cn('text-end font-mono font-semibold', t.profit >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtUSD(t.profit, 2)}</TableCell>
                <TableCell className="hidden text-[12px] lg:table-cell">{t.book === 'B' ? tr('Kept in-house', 'داخلي') : tr('Sent to partner', 'مُرسلة للشريك')}</TableCell>
                {view === 'open' && (
                  <TableCell className="text-end">
                    <Button size="xs" variant="outline" onClick={() => attempt(() => closeTrade(t.id), tr(`Trade ${t.ticket} closed`, `أُغلقت الصفقة ${t.ticket}`))}>{tr('Close', 'أغلق')}</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list.length === 0 && <p className="px-6 py-12 text-center text-[13px] text-muted-foreground">{tr('No trades here.', 'لا صفقات هنا.')}</p>}
      </SectionCard>
    </div>
  );
}
