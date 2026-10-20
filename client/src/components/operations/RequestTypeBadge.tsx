import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Receipt, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequestType } from '@/lib/data/types';
import { REQUEST_TYPE_LABEL } from '@/lib/data/labels';
import { useTranslation } from '@/lib/i18n/useTranslation';

export const TYPE_STYLE: Record<RequestType, { icon: typeof Receipt; cls: string }> = {
  deposit:       { icon: ArrowDownLeft,  cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
  withdrawal:    { icon: ArrowUpRight,   cls: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
  ib_deposit:    { icon: Network,        cls: 'text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300' },
  ib_withdrawal: { icon: Network,        cls: 'text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300' },
  transfer_to:   { icon: ArrowLeftRight, cls: 'text-violet-700 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300' },
  transfer_from: { icon: ArrowLeftRight, cls: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300' },
  expense:       { icon: Receipt,        cls: 'text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300' },
};

export function RequestTypeBadge({ type, className }: { type: RequestType; className?: string }) {
  const { tr } = useTranslation();
  const l = REQUEST_TYPE_LABEL[type];
  const s = TYPE_STYLE[type];
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', s.cls, className)}>
      <Icon className="h-3 w-3" />
      {tr(l.en, l.ar)}
    </span>
  );
}
