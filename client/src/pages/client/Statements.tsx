import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/shared/form';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtMoney, round2 } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { useMe } from './useMe';

export default function ClientStatements() {
  const { tr, nameOf } = useTranslation();
  const me = useMe();
  const months = useMemo(() => [...new Set(me.statement.map((s) => s.entry.date.slice(0, 7)))].sort().reverse(), [me.statement]);
  const [month, setMonth] = useState(months[0] ?? new Date().toISOString().slice(0, 7));

  const data = useMemo(() => {
    if (!me.account) return null;
    let start = me.account.opening;
    for (const s of me.statement) if (s.entry.date.slice(0, 7) < month) start += s.change;
    let running = start;
    const rows = me.statement.filter((s) => s.entry.date.slice(0, 7) === month).map((s) => {
      running = round2(running + s.change);
      return { ...s, after: running };
    });
    const moneyIn = round2(rows.filter((r) => r.change > 0).reduce((x, r) => x + r.change, 0));
    const moneyOut = round2(rows.filter((r) => r.change < 0).reduce((x, r) => x - r.change, 0));
    return { start: round2(start), end: running, rows, moneyIn, moneyOut };
  }, [me.account, me.statement, month]);

  if (!me.client || !data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight">{tr('Statement', 'كشف الحساب')}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{nameOf(me.client)} · MT5 {me.client.mt5Login} · {me.currency}</p>
        </div>
        <div className="flex gap-2">
          <NativeSelect value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto">
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </NativeSelect>
          <Button variant="outline" className="gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" />{tr('Print', 'طباعة')}</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: tr('Start of month', 'بداية الشهر'), v: data.start },
          { label: tr('Money in', 'مال داخل'), v: data.moneyIn, cls: 'text-success' },
          { label: tr('Money out', 'مال خارج'), v: -data.moneyOut, cls: 'text-destructive' },
          { label: tr('End of month', 'نهاية الشهر'), v: data.end },
        ].map((c) => (
          <div key={c.label} className="card-elevated p-4">
            <p className="text-[12px] text-muted-foreground">{c.label}</p>
            <p className={cn('mt-1 font-mono text-lg font-bold', c.cls)} dir="ltr">{fmtMoney(c.v, me.currency)}</p>
          </div>
        ))}
      </div>

      <SectionCard padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Date', 'التاريخ')}</TableHead>
              <TableHead>{tr('What happened', 'ماذا حدث')}</TableHead>
              <TableHead className="text-end">{tr('Change', 'التغيير')}</TableHead>
              <TableHead className="text-end">{tr('Balance', 'الرصيد')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r) => (
              <TableRow key={r.entry.id}>
                <TableCell className="text-[13px]">{r.entry.date}</TableCell>
                <TableCell className="text-[13px]">
                  {r.entry.kind === 'trade_pnl' ? tr('Trading result for the day', 'نتيجة التداول لليوم')
                    : r.entry.kind === 'deposit' ? tr('Money added', 'مال مضاف')
                    : r.entry.kind === 'withdrawal' ? tr('Money taken out', 'مال مسحوب')
                    : r.entry.memo}
                </TableCell>
                <TableCell className={cn('text-end font-mono font-semibold', r.change >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{r.change >= 0 ? '+' : '−'}{fmtMoney(Math.abs(r.change), me.currency)}</TableCell>
                <TableCell className="text-end font-mono" dir="ltr">{fmtMoney(r.after, me.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">{tr('Balance at the end', 'الرصيد في النهاية')}</TableCell>
              <TableCell className="text-end font-mono font-bold" dir="ltr">{fmtMoney(data.end, me.currency)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </SectionCard>
    </div>
  );
}
