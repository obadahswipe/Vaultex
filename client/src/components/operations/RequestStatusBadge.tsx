import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/lib/data/types';
import { STATUS_LABEL } from '@/lib/data/labels';
import { useTranslation } from '@/lib/i18n/useTranslation';

const styles: Record<RequestStatus, string> = {
  pending:   'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  executed:  'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
  voucher:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  rejected:  'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

export function RequestStatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const { tr } = useTranslation();
  const l = STATUS_LABEL[status];
  return (
    <span title={tr(l.helpEn, l.helpAr)} className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', styles[status], className)}>
      {tr(l.en, l.ar)}
    </span>
  );
}
