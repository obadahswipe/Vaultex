import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoneyRequestDialog } from '@/components/client/MoneyRequestDialog';
import { fmtMoney } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { useMe, CLIENT_STATUS } from './useMe';

export default function ClientTransactions() {
  const { tr } = useTranslation();
  const me = useMe();
  const [kind, setKind] = useState<'deposit' | 'withdrawal' | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight">{tr('My money', 'أموالي')}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{tr('Money you added or took out, and where each request is.', 'المال الذي أضفته أو سحبته، وأين وصل كل طلب.')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="gradient" className="gap-1.5" onClick={() => setKind('deposit')}><ArrowDownLeft className="h-4 w-4" />{tr('Add money', 'أضف مالًا')}</Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setKind('withdrawal')}><ArrowUpRight className="h-4 w-4" />{tr('Take out money', 'اسحب مالًا')}</Button>
        </div>
      </div>

      <SectionCard padded={false} title={tr('My requests', 'طلباتي')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Date', 'التاريخ')}</TableHead>
              <TableHead>{tr('What', 'ماذا')}</TableHead>
              <TableHead className="text-end">{tr('Amount', 'المبلغ')}</TableHead>
              <TableHead>{tr('Where is it?', 'أين وصل؟')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {me.requests.map((r) => {
              const s = CLIENT_STATUS[r.status];
              const l = r.lines[0];
              const note = r.timeline.find((x) => x.action === 'rejected')?.note;
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-[13px]">{r.date}</TableCell>
                  <TableCell className="text-[13px]">{r.type === 'deposit' ? tr('Add money', 'إضافة مال') : r.type === 'withdrawal' ? tr('Take out money', 'سحب مال') : tr('Move money', 'نقل مال')}</TableCell>
                  <TableCell className="text-end font-mono font-semibold" dir="ltr">{fmtMoney(l?.amount ?? 0, l?.currency)}</TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', s.tone)}>{tr(s.en, s.ar)}</span>
                    {note && <p className="mt-1 text-[11px] text-muted-foreground">“{note}”</p>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {me.requests.length === 0 && <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{tr('No requests yet.', 'لا طلبات بعد.')}</p>}
      </SectionCard>

      <MoneyRequestDialog kind={kind} onClose={() => setKind(null)} />
    </div>
  );
}
