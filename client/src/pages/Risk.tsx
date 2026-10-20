import { useMemo } from 'react';
import { ShieldAlert, Scale, TrendingDown, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBooks } from '@/stores/books.store';
import { useLedger } from '@/lib/data/hooks';
import { SYMBOL_PRICES } from '@/lib/data/seed';
import { fmtUSD, fmtShort, round2 } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

export default function Risk() {
  const { tr, nameOf } = useTranslation();
  const trades = useBooks((s) => s.trades);
  const clients = useBooks((s) => s.clients);
  const { balances, sheet } = useLedger();

  const open = trades.filter((t) => t.status === 'open');
  const inHouse = open.filter((t) => t.book === 'B');

  const bySymbol = useMemo(() => {
    const map = new Map<string, { symbol: string; buy: number; sell: number; size: number; clientResult: number; trades: number }>();
    for (const t of inHouse) {
      const r = map.get(t.symbol) ?? { symbol: t.symbol, buy: 0, sell: 0, size: 0, clientResult: 0, trades: 0 };
      if (t.side === 'buy') r.buy += t.lots; else r.sell += t.lots;
      const contract = SYMBOL_PRICES[t.symbol]?.contract ?? 1;
      const usdPerLot = t.symbol === 'USDJPY' ? contract : contract * t.currentPrice;
      r.size += (t.side === 'buy' ? 1 : -1) * t.lots * usdPerLot;
      r.clientResult += t.profit;
      r.trades++;
      map.set(t.symbol, r);
    }
    return [...map.values()].map((r) => ({ ...r, buy: round2(r.buy), sell: round2(r.sell), size: round2(r.size), clientResult: round2(r.clientResult) }))
      .sort((a, b) => Math.abs(b.size) - Math.abs(a.size));
  }, [inHouse]);

  const totalSize = bySymbol.reduce((s, r) => s + Math.abs(r.size), 0);
  const companyNow = -round2(inHouse.reduce((s, t) => s + t.profit, 0));
  const ownersMoney = sheet.owners + sheet.profit;
  const ratio = ownersMoney > 0 ? totalSize / ownersMoney : 0;
  const level = ratio < 1 ? 'low' : ratio < 3 ? 'medium' : 'high';
  const levelText = {
    low: { en: 'Low', ar: 'منخفض', cls: 'text-success bg-success/12' },
    medium: { en: 'Medium', ar: 'متوسط', cls: 'text-warning bg-warning/12' },
    high: { en: 'High', ar: 'مرتفع', cls: 'text-destructive bg-destructive/12' },
  }[level];

  const lowMoney = useMemo(() => clients.map((c) => {
    const bal = balances[c.accountNo] ?? 0;
    const floating = round2(open.filter((t) => t.clientId === c.id).reduce((s, t) => s + t.profit, 0));
    return { c, bal, floating, left: round2(bal + floating) };
  }).filter((r) => r.floating !== 0 || r.bal < 0).sort((a, b) => a.left - b.left).slice(0, 6), [clients, balances, open]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Risk', 'المخاطر')}
        subtitle={tr('How much your company could win or lose right now.', 'كم يمكن أن تربح شركتك أو تخسر الآن.')}
        hint={
          <PageHint id="risk-v2" title={tr('What is risk?', 'ما هي المخاطر؟')}>
            {tr('When you keep a trade in-house, you take the other side. If prices move against you, you lose money. This page shows how big those trades are compared with the owners’ money.', 'عندما تُبقي الصفقة داخليًا فإنك تأخذ الطرف الآخر. إذا تحركت الأسعار ضدك تخسر المال. هذه الصفحة تبيّن حجم هذه الصفقات مقارنة بأموال المالكين.')}
          </PageHint>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-6">
          <p className="text-[13px] font-medium text-muted-foreground">{tr('Risk level', 'مستوى الخطر')}</p>
          <p className={cn('mt-3 inline-flex rounded-full px-4 py-1.5 text-xl font-bold', levelText.cls)}>{tr(levelText.en, levelText.ar)}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{tr(`Open trades are ${ratio.toFixed(1)}× the owners’ money`, `الصفقات المفتوحة تساوي ${ratio.toFixed(1)} ضعف أموال المالكين`)}</p>
        </div>
        <StatCard label={tr('Size of in-house trades', 'حجم الصفقات الداخلية')} value={fmtShort(totalSize)} icon={Scale} accent="blue" deltaLabel={tr(`${inHouse.length} trades kept in-house`, `${inHouse.length} صفقة داخلية`)} />
        <StatCard label={tr('Company result now', 'نتيجة الشركة الآن')} value={fmtUSD(companyNow)} icon={companyNow >= 0 ? ShieldAlert : TrendingDown} accent={companyNow >= 0 ? 'green' : 'pink'} deltaLabel={tr('If every open trade closed now', 'لو أُغلقت كل الصفقات الآن')} />
        <StatCard label={tr('Sent to partner', 'مُرسلة للشريك')} value={open.length - inHouse.length} icon={Users} accent="violet" deltaLabel={tr('Trades where a partner takes the risk', 'صفقات يتحمل خطرها الشريك')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard padded={false} title={tr('By symbol', 'حسب الرمز')} description={tr('Positive size: clients bought more. Negative: they sold more.', 'حجم موجب: الزبائن اشتروا أكثر. سالب: باعوا أكثر.')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('Symbol', 'الرمز')}</TableHead>
                <TableHead className="text-end">{tr('Bought', 'شراء')}</TableHead>
                <TableHead className="text-end">{tr('Sold', 'بيع')}</TableHead>
                <TableHead className="text-end">{tr('Size', 'الحجم')}</TableHead>
                <TableHead className="text-end">{tr('You now', 'أنت الآن')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySymbol.map((r) => (
                <TableRow key={r.symbol}>
                  <TableCell className="font-mono font-semibold">{r.symbol}</TableCell>
                  <TableCell className="text-end">{r.buy}</TableCell>
                  <TableCell className="text-end">{r.sell}</TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{fmtShort(r.size)}</TableCell>
                  <TableCell className={cn('text-end font-mono font-semibold', -r.clientResult >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtUSD(-r.clientResult)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {bySymbol.length === 0 && <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{tr('No in-house trades are open. No risk right now.', 'لا توجد صفقات داخلية مفتوحة. لا خطر الآن.')}</p>}
        </SectionCard>

        <SectionCard padded={false} title={tr('Clients with the least money left', 'الزبائن الأقل مالًا')} description={tr('Their money plus their open win or loss.', 'مالهم مع ربح أو خسارة صفقاتهم المفتوحة.')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('Client', 'الزبون')}</TableHead>
                <TableHead className="text-end">{tr('Money', 'المال')}</TableHead>
                <TableHead className="text-end">{tr('Open result', 'النتيجة المفتوحة')}</TableHead>
                <TableHead className="text-end">{tr('Left', 'المتبقي')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowMoney.map((r) => (
                <TableRow key={r.c.id}>
                  <TableCell className="font-medium">{nameOf(r.c)}</TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{fmtUSD(r.bal)}</TableCell>
                  <TableCell className={cn('text-end font-mono', r.floating >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtUSD(r.floating)}</TableCell>
                  <TableCell className={cn('text-end font-mono font-semibold', r.left < 0 && 'text-destructive')} dir="ltr">{fmtUSD(r.left)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </div>
  );
}
