import { SectionCard } from '@/components/shared/SectionCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtUSD, fmtMoney } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { CLIENT_STATUS } from '@/pages/client/useMe';
import { useMyIB } from './useMyIB';

export default function IBCommissions() {
  const { tr } = useTranslation();
  const me = useMyIB();
  if (!me) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight">{tr('My pay', 'أجري')}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">{tr(`Right now we owe you ${fmtUSD(me.owed, 2)}.`, `نحن مدينون لك الآن بمبلغ ${fmtUSD(me.owed, 2)}.`)}</p>
      </div>

      {me.payRequests.length > 0 && (
        <SectionCard padded={false} title={tr('My pay requests', 'طلبات أجري')}>
          <Table>
            <TableHeader><TableRow><TableHead>{tr('Date', 'التاريخ')}</TableHead><TableHead className="text-end">{tr('Amount', 'المبلغ')}</TableHead><TableHead>{tr('Where is it?', 'أين وصل؟')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {me.payRequests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-[13px]">{r.date}</TableCell>
                  <TableCell className="text-end font-mono font-semibold" dir="ltr">{fmtMoney(r.lines[0].amount, r.lines[0].currency)}</TableCell>
                  <TableCell><span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', CLIENT_STATUS[r.status].tone)}>{tr(CLIENT_STATUS[r.status].en, CLIENT_STATUS[r.status].ar)}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <SectionCard padded={false} title={tr('Every day', 'كل يوم')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Date', 'التاريخ')}</TableHead>
              <TableHead>{tr('What', 'ماذا')}</TableHead>
              <TableHead className="text-end">{tr('Amount', 'المبلغ')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {me.pay.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-[13px]">{p.date}</TableCell>
                <TableCell className="text-[13px]">{p.kind === 'ib_commission' ? tr('Pay earned from your clients’ trades', 'أجر من صفقات زبائنك') : tr('We paid you', 'دفعنا لك')}</TableCell>
                <TableCell className={cn('text-end font-mono font-semibold', p.amount >= 0 ? 'text-success' : 'text-foreground')} dir="ltr">{p.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(p.amount), 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
