import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OperationRequest } from '@/lib/data/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useBooks } from '@/stores/books.store';
import { fmtMoney } from '@/lib/data/money';

function CopyField({ label, value }: { label: string; value: string }) {
  const { tr } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold" dir="ltr">{value}</p>
      </div>
      <button
        onClick={copy}
        className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent', copied ? 'text-emerald-500' : 'text-muted-foreground')}
        title={tr('Copy', 'نسخ')}
        aria-label={tr('Copy', 'نسخ')}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/** What the cashier types into MT5. Copy buttons avoid typing mistakes. */
export function ExecutionView({ request }: { request: OperationRequest }) {
  const { tr } = useTranslation();
  const clients = useBooks((s) => s.clients);
  const ibs = useBooks((s) => s.ibs);
  const adding = request.type === 'deposit' || request.type === 'ib_deposit' || request.type === 'transfer_to';

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Terminal className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-primary">{tr('Do this in MT5', 'افعل هذا في MT5')}</p>
      </div>
      <div className="space-y-2">
        {request.lines.map((line) => {
          const client = clients.find((c) => c.accountNo === line.accountNo);
          const ib = ibs.find((i) => i.treeAccountCode === line.accountNo);
          const login = client?.mt5Login ?? ib?.mt5AccountNo;
          return (
            <div key={line.id} className="space-y-2">
              <p className="text-[13px]">
                {adding
                  ? tr(`Add ${fmtMoney(line.amount, line.currency)} to this MT5 account:`, `أضف ${fmtMoney(line.amount, line.currency)} إلى حساب MT5 هذا:`)
                  : tr(`Take ${fmtMoney(line.amount, line.currency)} out of this MT5 account:`, `اسحب ${fmtMoney(line.amount, line.currency)} من حساب MT5 هذا:`)}
              </p>
              {login && <CopyField label={tr('MT5 account number', 'رقم حساب MT5')} value={login} />}
              <div className="grid grid-cols-2 gap-2">
                <CopyField label={tr('Amount', 'المبلغ')} value={line.amount.toString()} />
                <CopyField label={tr('Comment', 'تعليق')} value={`REQ-${request.requestNo}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
