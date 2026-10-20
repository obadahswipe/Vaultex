import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerLine } from '@/lib/data/types';
import { lineEffect } from '@/lib/data/ledger';
import { fmtMoney } from '@/lib/data/money';
import { useLedger } from '@/lib/data/hooks';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Shows an entry the way a person thinks about it: which accounts go up and which go down.
 * Every entry has at least two lines, because money always comes from somewhere and goes somewhere.
 */
export function LedgerPreview({ lines, className }: { lines: LedgerLine[]; className?: string }) {
  const { byCode } = useLedger();
  const { tr, nameOf } = useTranslation();
  return (
    <ul className={cn('divide-y divide-border/40 rounded-xl border border-border/60 bg-card', className)}>
      {lines.map((l, i) => {
        const acc = byCode.get(l.accountCode);
        if (!acc) return null;
        const effect = lineEffect(acc, l);
        const up = effect >= 0;
        return (
          <li key={i} className="flex items-center gap-3 px-3 py-2.5">
            <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', up ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive')}>
              {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{nameOf(acc)}</span>
              <span className="block text-[11px] text-muted-foreground">
                {up ? tr('goes up by', 'يزيد بمقدار') : tr('goes down by', 'ينقص بمقدار')}
              </span>
            </span>
            <span className={cn('font-mono text-[13px] font-semibold tabular-nums', up ? 'text-success' : 'text-destructive')} dir="ltr">
              {up ? '+' : '−'}{fmtMoney(Math.abs(effect), acc.currency)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
