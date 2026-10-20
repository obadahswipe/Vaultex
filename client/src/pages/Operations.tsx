import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, CheckCircle2, Send, BookCheck, Hourglass, XCircle, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NativeSelect } from '@/components/shared/form';
import { RequestTypeBadge } from '@/components/operations/RequestTypeBadge';
import { RequestStatusBadge } from '@/components/operations/RequestStatusBadge';
import { RequestDetailSheet } from '@/components/operations/RequestDetailSheet';
import { NewRequestDialog } from '@/components/operations/NewRequestDialog';
import { useRequestActions } from '@/components/operations/useRequestActions';
import { useBooks } from '@/stores/books.store';
import { useLedger } from '@/lib/data/hooks';
import { fmtMoney, fmtUSD } from '@/lib/data/money';
import { requestTotalUSD } from '@/lib/data/ledger';
import { REQUEST_TYPE_LABEL } from '@/lib/data/labels';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { OperationRequest, RequestType } from '@/lib/data/types';

type Tab = 'pending' | 'confirmed' | 'executed' | 'voucher' | 'rejected' | 'all';

function waitedFor(iso: string, tr: (en: string, ar: string) => string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return tr(`${mins} min`, `${mins} د`);
  const h = Math.floor(mins / 60);
  if (h < 48) return tr(`${h} h`, `${h} س`);
  return tr(`${Math.floor(h / 24)} days`, `${Math.floor(h / 24)} أيام`);
}

export default function Operations() {
  const { tr, nameOf } = useTranslation();
  const requests = useBooks((s) => s.requests);
  const { byCode, rates } = useLedger();
  const { nextStep } = useRequestActions();
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'pending');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'ALL'>('ALL');
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  const [newOpen, setNewOpen] = useState(params.get('new') === '1');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = params.get('tab') as Tab | null;
    if (t) setTab(t);
    if (params.get('open')) setOpenId(params.get('open'));
    if (params.get('new') === '1') setNewOpen(true);
  }, [params]);

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      confirmed: requests.filter((r) => r.status === 'confirmed').length,
      executed: requests.filter((r) => r.status === 'executed').length,
      voucherToday: requests.filter((r) => r.status === 'voucher' && r.date === today).length,
      voucher: requests.filter((r) => r.status === 'voucher').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => tab === 'all' || r.status === tab)
      .filter((r) => typeFilter === 'ALL' || r.type === typeFilter || (typeFilter === 'transfer_from' && r.type === 'transfer_to'))
      .filter((r) => {
        if (!q) return true;
        const names = r.lines.map((l) => {
          const a = byCode.get(l.accountNo);
          return `${l.accountNo} ${a?.name ?? ''} ${a?.arabic ?? ''}`;
        }).join(' ').toLowerCase();
        return String(r.requestNo) === q.replace('#', '') || names.includes(q) || (r.note ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => (a.priority === 'urgent' ? -1 : 0) - (b.priority === 'urgent' ? -1 : 0) || b.requestNo - a.requestNo);
  }, [requests, tab, typeFilter, search, byCode]);

  const steps = [
    { key: 'pending' as Tab,   n: 1, icon: Hourglass,  en: 'Needs OK',          ar: 'تحتاج موافقة',     count: counts.pending,   tone: 'amber' },
    { key: 'confirmed' as Tab, n: 2, icon: Send,       en: 'Send the money',    ar: 'أرسل المال',        count: counts.confirmed, tone: 'blue' },
    { key: 'executed' as Tab,  n: 3, icon: BookCheck,  en: 'Write in books',    ar: 'سجّل في الدفاتر',  count: counts.executed,  tone: 'violet' },
    { key: 'voucher' as Tab,   n: 4, icon: CheckCircle2, en: 'Done',            ar: 'مكتمل',             count: counts.voucherToday, tone: 'green' },
  ];
  const toneCls: Record<string, string> = {
    amber: 'text-amber-600 bg-amber-500/10', blue: 'text-blue-600 bg-blue-500/10',
    violet: 'text-violet-600 bg-violet-500/10', green: 'text-emerald-600 bg-emerald-500/10',
  };

  const pendingInView = filtered.filter((r) => r.status === 'pending');
  const selectable = pendingInView.filter((r) => nextStep(r)?.allowed);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));

  const bulkOk = () => {
    let n = 0;
    for (const r of selectable) if (selected.has(r.id) && nextStep(r)?.run()) n++;
    setSelected(new Set());
    return n;
  };

  const changeTab = (t: Tab) => {
    setTab(t);
    setSelected(new Set());
    const p = new URLSearchParams(params); p.set('tab', t); p.delete('open'); setParams(p, { replace: true });
  };

  const whoOf = (r: OperationRequest) => r.lines.map((l) => {
    const a = byCode.get(l.accountNo);
    return a ? nameOf(a) : l.accountName ?? l.accountNo;
  }).join(', ');
  const whereOf = (r: OperationRequest) => {
    const c = r.lines[0]?.counterAccountCode;
    const a = c ? byCode.get(c) : undefined;
    return a ? nameOf(a) : '—';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Money requests', 'طلبات المال')}
        subtitle={tr('Every time money comes in or goes out, it goes through 4 simple steps.', 'كل مرة يدخل فيها المال أو يخرج، يمرّ بأربع خطوات بسيطة.')}
        hint={
          <PageHint id="ops-v2" title={tr('How a money request works', 'كيف يعمل طلب المال')}>
            {tr(
              '1) Someone makes a request. 2) A different person says OK. 3) The cashier sends the money on MT5. 4) Vaultex writes it in the books. Click a box below to see the requests at that step.',
              '1) شخص ينشئ الطلب. 2) شخص آخر يوافق. 3) أمين الصندوق يرسل المال على MT5. 4) فولتكس يسجّله في الدفاتر. اضغط على مربع بالأسفل لترى الطلبات في تلك الخطوة.',
            )}
          </PageHint>
        }
        actions={
          <Button variant="gradient" className="gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> {tr('New request', 'طلب جديد')}
          </Button>
        }
      />

      {/* The four steps */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {steps.map((s) => {
          const Icon = s.icon;
          const active = tab === s.key;
          return (
            <button
              key={s.key}
              onClick={() => changeTab(s.key)}
              className={cn(
                'card-elevated relative flex items-center gap-3 p-4 text-start transition-all hover:-translate-y-0.5',
                active && 'ring-2 ring-primary',
              )}
            >
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', toneCls[s.tone])}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tr(`Step ${s.n}`, `الخطوة ${s.n}`)}</span>
                <span className="block text-[15px] font-bold leading-tight">{tr(s.en, s.ar)}</span>
              </span>
              <span className="ms-auto text-2xl font-extrabold tabular-nums">{s.count}</span>
            </button>
          );
        })}
      </div>
      {tab === 'voucher' && (
        <p className="-mt-4 text-[12px] text-muted-foreground">{tr(`The number shows today. The list below shows all ${counts.voucher} finished requests.`, `الرقم يعرض اليوم فقط. القائمة بالأسفل تعرض كل الطلبات المكتملة (${counts.voucher}).`)}</p>
      )}

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search by name or request number…', 'ابحث بالاسم أو رقم الطلب…')} className="ps-9" />
          </div>
          <NativeSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as RequestType | 'ALL')} className="w-auto min-w-[160px]">
            <option value="ALL">{tr('All kinds', 'كل الأنواع')}</option>
            {(['deposit', 'withdrawal', 'ib_withdrawal', 'ib_deposit', 'transfer_from', 'expense'] as RequestType[]).map((t) => (
              <option key={t} value={t}>{tr(REQUEST_TYPE_LABEL[t].en, REQUEST_TYPE_LABEL[t].ar)}</option>
            ))}
          </NativeSelect>
          <div className="flex gap-1">
            <Button size="sm" variant={tab === 'rejected' ? 'default' : 'ghost'} onClick={() => changeTab('rejected')} className="gap-1">
              <XCircle className="h-3.5 w-3.5" /> {tr('Said no', 'مرفوضة')} ({counts.rejected})
            </Button>
            <Button size="sm" variant={tab === 'all' ? 'default' : 'ghost'} onClick={() => changeTab('all')} className="gap-1">
              <ListChecks className="h-3.5 w-3.5" /> {tr('All', 'الكل')}
            </Button>
          </div>
        </div>

        {tab === 'pending' && selectable.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border/40 bg-muted/30 px-5 py-2.5 text-[13px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))} className="h-4 w-4" />
              {tr('Pick all I can say OK to', 'اختر كل ما أستطيع الموافقة عليه')}
            </label>
            {selected.size > 0 && (
              <Button size="sm" variant="gradient" onClick={bulkOk}>{tr(`Say OK to ${selected.size}`, `وافق على ${selected.size}`)}</Button>
            )}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {tab === 'pending' && <TableHead className="w-10" />}
                <TableHead className="w-16">#</TableHead>
                <TableHead>{tr('Who', 'من')}</TableHead>
                <TableHead>{tr('What', 'ماذا')}</TableHead>
                <TableHead className="text-end">{tr('Amount', 'المبلغ')}</TableHead>
                <TableHead className="hidden xl:table-cell">{tr('Money place', 'مكان المال')}</TableHead>
                <TableHead>{tr('Step', 'الخطوة')}</TableHead>
                <TableHead className="text-end">{tr('Next', 'التالي')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const step = nextStep(r);
                const line = r.lines[0];
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                    {tab === 'pending' && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {step?.allowed && (
                          <input type="checkbox" checked={selected.has(r.id)} onChange={() => setSelected((p) => { const n = new Set(p); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} className="h-4 w-4" />
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.requestNo}
                      {r.priority === 'urgent' && <span className="ms-1 rounded bg-red-100 px-1 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">!</span>}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{whoOf(r)}</p>
                      <p className="text-[11px] text-muted-foreground">{r.date} · {tr('waited', 'انتظر')} {waitedFor(r.timeline[0]?.at ?? r.date, tr)}</p>
                    </TableCell>
                    <TableCell><RequestTypeBadge type={r.type} /></TableCell>
                    <TableCell className="text-end font-mono text-sm font-semibold" dir="ltr">
                      {line ? fmtMoney(line.amount, line.currency) : '—'}
                      {line && line.currency !== 'USD' && <p className="text-[11px] font-normal text-muted-foreground">≈ {fmtUSD(requestTotalUSD(r, rates))}</p>}
                    </TableCell>
                    <TableCell className="hidden text-[13px] text-muted-foreground xl:table-cell">{whereOf(r)}</TableCell>
                    <TableCell><RequestStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                      {step ? (
                        <Button size="sm" variant={step.allowed ? 'default' : 'outline'} disabled={!step.allowed} title={step.why} onClick={() => step.run()}>
                          {step.label}
                        </Button>
                      ) : <span className="text-[12px] text-muted-foreground">{r.voucherRef ? tr(`Entry ${r.voucherRef.replace('V-', '')}`, `قيد ${r.voucherRef.replace('V-', '')}`) : '—'}</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Phone cards */}
        <div className="divide-y divide-border/40 md:hidden">
          {filtered.map((r) => {
            const step = nextStep(r);
            const line = r.lines[0];
            return (
              <div key={r.id} className="space-y-2 px-4 py-3" onClick={() => setOpenId(r.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{whoOf(r)}</p>
                    <p className="text-[11px] text-muted-foreground">#{r.requestNo} · {r.date}</p>
                  </div>
                  <p className="font-mono font-bold" dir="ltr">{line ? fmtMoney(line.amount, line.currency) : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RequestTypeBadge type={r.type} />
                  <RequestStatusBadge status={r.status} />
                  {step && (
                    <Button size="xs" className="ms-auto" disabled={!step.allowed} onClick={(e) => { e.stopPropagation(); step.run(); }}>{step.label}</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
            <p className="text-[15px] font-semibold">{tr('Nothing here', 'لا شيء هنا')}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {tab === 'pending' ? tr('No request is waiting for an OK.', 'لا يوجد طلب ينتظر الموافقة.') : tr('Try another step or search word.', 'جرّب خطوة أو كلمة بحث أخرى.')}
            </p>
          </div>
        )}
      </SectionCard>

      <RequestDetailSheet requestId={openId} onClose={() => { setOpenId(null); const p = new URLSearchParams(params); p.delete('open'); setParams(p, { replace: true }); }} />
      <NewRequestDialog open={newOpen} onClose={() => { setNewOpen(false); const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }); }} />
    </div>
  );
}
