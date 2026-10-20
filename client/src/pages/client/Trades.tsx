import { useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Segmented } from '@/components/shared/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtMoney } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { useMe } from './useMe';

export default function ClientTrades() {
  const { tr } = useTranslation();
  const me = useMe();
  const [view, setView] = useState<'open' | 'closed'>('open');
  const list = (view === 'open' ? me.open : me.trades.filter((t) => t.status === 'closed')).slice().reverse();
  const closedResult = me.trades.filter((t) => t.status === 'closed').reduce((s, t) => s + t.profit, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight">{tr('My trades', 'صفقاتي')}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {tr(`All my closed trades together: `, `كل صفقاتي المغلقة معًا: `)}
          <span className={cn('font-mono font-semibold', closedResult >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtMoney(closedResult)}</span>
        </p>
      </div>
      <Segmented value={view} onChange={setView} options={[
        { value: 'open', label: tr('Open now', 'مفتوحة الآن'), count: me.open.length },
        { value: 'closed', label: tr('Closed', 'مغلقة') },
      ]} />
      <SectionCard padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('What', 'ماذا')}</TableHead>
              <TableHead className="text-end">{tr('Lots', 'لوت')}</TableHead>
              <TableHead className="hidden text-end sm:table-cell">{tr('Price', 'السعر')}</TableHead>
              <TableHead className="text-end">{tr('Result', 'النتيجة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <span className={cn('me-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold', t.side === 'buy' ? 'bg-emerald-500/12 text-emerald-600' : 'bg-red-500/12 text-red-600')}>{t.side === 'buy' ? tr('BUY', 'شراء') : tr('SELL', 'بيع')}</span>
                  <span className="font-mono font-semibold">{t.symbol}</span>
                  <p className="text-[11px] text-muted-foreground">#{t.ticket} · {(t.closedAt ?? t.openedAt).slice(0, 16).replace('T', ' ')}</p>
                </TableCell>
                <TableCell className="text-end">{t.lots}</TableCell>
                <TableCell className="hidden text-end font-mono text-[12px] sm:table-cell" dir="ltr">{t.openPrice} → {t.closePrice ?? t.currentPrice}</TableCell>
                <TableCell className={cn('text-end font-mono font-semibold', t.profit >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtMoney(t.profit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list.length === 0 && <p className="px-6 py-12 text-center text-[13px] text-muted-foreground">{tr('No trades here.', 'لا صفقات هنا.')}</p>}
      </SectionCard>
    </div>
  );
}
