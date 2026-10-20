import { useMemo, useState } from 'react';
import { Info, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequestStatusBadge } from './RequestStatusBadge';
import { RequestTypeBadge } from './RequestTypeBadge';
import { RequestTimeline } from './RequestTimeline';
import { ExecutionView } from './ExecutionView';
import { LedgerPreview } from './LedgerPreview';
import { useRequestActions } from './useRequestActions';
import { useBooks } from '@/stores/books.store';
import { useLedger } from '@/lib/data/hooks';
import { buildRequestLines } from '@/lib/data/ledger';
import { fmtMoney } from '@/lib/data/money';
import { STATUS_LABEL } from '@/lib/data/labels';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function RequestDetailSheet({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const { tr, nameOf } = useTranslation();
  const request = useBooks((s) => s.requests.find((r) => r.id === requestId) ?? null);
  const entries = useBooks((s) => s.entries);
  const manualMT5 = useBooks((s) => s.ops.manualMT5Execution);
  const { accounts, rates, byCode } = useLedger();
  const { nextStep, canReject, reject } = useRequestActions();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const lines = useMemo(() => {
    if (!request) return [];
    if (request.entryId) return entries.find((e) => e.id === request.entryId)?.lines ?? [];
    try { return buildRequestLines(request, accounts, rates); } catch { return []; }
  }, [request, entries, accounts, rates]);

  if (!request) return null;
  const step = nextStep(request);
  const status = STATUS_LABEL[request.status];

  return (
    <Dialog open={!!request} onOpenChange={(o) => { if (!o) { setRejecting(false); onClose(); } }}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {tr(`Money request #${request.requestNo}`, `طلب مال رقم ${request.requestNo}`)}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <RequestTypeBadge type={request.type} />
              <RequestStatusBadge status={request.status} />
              {request.priority === 'urgent' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{tr('Urgent', 'مستعجل')}</span>}
              {request.source === 'client_portal' && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{tr('From the client page', 'من صفحة الزبون')}</span>}
              {request.source === 'ib_portal' && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{tr('From the partner page', 'من صفحة الشريك')}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <p className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-[13px]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {tr(status.helpEn, status.helpAr)}
        </p>

        <div className="space-y-2">
          {request.lines.map((l) => {
            const who = byCode.get(l.accountNo);
            const where = l.counterAccountCode ? byCode.get(l.counterAccountCode) : undefined;
            return (
              <div key={l.id} className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 p-3 text-[13px]">
                <div>
                  <p className="text-[11px] text-muted-foreground">{tr('Who', 'من')}</p>
                  <p className="font-semibold">{who ? nameOf(who) : l.accountName ?? l.accountNo}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{tr('Amount', 'المبلغ')}</p>
                  <p className="font-mono font-semibold" dir="ltr">{fmtMoney(l.amount, l.currency)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground">{tr('Money place', 'مكان المال')}</p>
                  <p className="font-medium">{where ? nameOf(where) : '—'}</p>
                  {l.exchangeRate && where && (
                    <p className="text-[11px] text-muted-foreground">
                      {tr(`Rate ${l.exchangeRate} → ${fmtMoney(l.receivedAmount ?? l.amount * l.exchangeRate, where.currency)}`, `السعر ${l.exchangeRate} ← ${fmtMoney(l.receivedAmount ?? l.amount * l.exchangeRate, where.currency)}`)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {request.note && <p className="rounded-xl bg-muted/50 p-3 text-[13px]">“{request.note}”</p>}
        </div>

        {request.status === 'confirmed' && manualMT5 && <ExecutionView request={request} />}

        {lines.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold">
              {request.status === 'voucher'
                ? tr(`Written in the books (entry ${request.voucherRef?.replace('V-', '')})`, `مسجّل في الدفاتر (القيد ${request.voucherRef?.replace('V-', '')})`)
                : tr('What will change in the books', 'ما الذي سيتغير في الدفاتر')}
            </p>
            <LedgerPreview lines={lines} />
          </div>
        )}

        <div>
          <p className="mb-2 text-[13px] font-semibold">{tr('History', 'السجل')}</p>
          <RequestTimeline events={request.timeline} />
        </div>

        {rejecting ? (
          <div className="space-y-2 rounded-xl border border-destructive/30 p-3">
            <p className="text-[13px] font-medium">{tr('Why are you saying no?', 'لماذا ترفض؟')}</p>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('For example: the name does not match', 'مثال: الاسم غير مطابق')} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejecting(false)}>{tr('Cancel', 'إلغاء')}</Button>
              <Button variant="destructive" onClick={() => { if (reject(request, reason || undefined)) setRejecting(false); }}>{tr('Say no', 'ارفض')}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {canReject(request) ? (
              <Button variant="ghost" className="gap-1 text-destructive" onClick={() => setRejecting(true)}>
                <XCircle className="h-4 w-4" /> {tr('Say no', 'ارفض')}
              </Button>
            ) : <span />}
            {step && (
              <div className="flex flex-col items-end gap-1">
                <Button variant="gradient" disabled={!step.allowed} onClick={() => step.run()}>{step.label}</Button>
                {!step.allowed && step.why && <p className="max-w-xs text-end text-[12px] text-muted-foreground">{step.why}</p>}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
