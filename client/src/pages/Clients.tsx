import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, Wallet, AlertTriangle, FileWarning, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Segmented, TextArea, Toggle, attempt } from '@/components/shared/form';
import { NewRequestDialog } from '@/components/operations/NewRequestDialog';
import { RequestStatusBadge } from '@/components/operations/RequestStatusBadge';
import { RequestTypeBadge } from '@/components/operations/RequestTypeBadge';
import { useBooks } from '@/stores/books.store';
import { useLedger, useReconciliation } from '@/lib/data/hooks';
import { fmtMoney, fmtShort } from '@/lib/data/money';
import { lineEffect } from '@/lib/data/ledger';
import { CLASS_LABEL } from '@/lib/data/labels';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { CURRENCIES, type ClientClassification, type ClientRecord, type Currency, type RequestType } from '@/lib/data/types';

type Filter = 'all' | 'good' | 'careful' | 'docs' | 'owe';

function KycBadge({ status }: { status?: ClientRecord['kycStatus'] }) {
  const { tr } = useTranslation();
  if (status === 'approved') return <Badge variant="success">{tr('ID checked', 'تم التحقق')}</Badge>;
  if (status === 'pending') return <Badge variant="warning">{tr('ID sent, check it', 'أرسل الهوية، راجعها')}</Badge>;
  return <Badge variant="destructive">{tr('No ID yet', 'لا هوية بعد')}</Badge>;
}

function AddClientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tr, nameOf } = useTranslation();
  const addClient = useBooks((s) => s.addClient);
  const ibs = useBooks((s) => s.ibs);
  const [f, setF] = useState({ name: '', arabic: '', email: '', phone: '', country: '', currency: 'USD' as Currency, ib: '', limit: '' });
  useEffect(() => { if (open) setF({ name: '', arabic: '', email: '', phone: '', country: '', currency: 'USD', ib: '', limit: '' }); }, [open]);
  const save = () => {
    if (!f.name.trim()) return;
    const ok = attempt(() => addClient({
      name: f.name.trim(), arabic: f.arabic.trim() || undefined, email: f.email || undefined, phone: f.phone || undefined,
      country: f.country || undefined, currency: f.currency, ibParentId: f.ib || undefined,
      creditLimit: f.limit ? Number(f.limit) : undefined, classification: 'neutral', active: true,
      joinDate: new Date().toISOString().slice(0, 10), kycStatus: 'missing',
    }), tr(`${f.name} was added`, `تمت إضافة ${f.arabic || f.name}`));
    if (ok) onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr('Add a client', 'أضف زبونًا')}</DialogTitle>
          <DialogDescription>{tr('Vaultex makes an account for them in the books, ready to use.', 'فولتكس ينشئ له حسابًا في الدفاتر جاهزًا للاستخدام.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={f.arabic} onChange={(e) => setF({ ...f, arabic: e.target.value })} /></Field>
          <Field label={tr('Email', 'البريد الإلكتروني')}><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label={tr('Phone', 'الهاتف')}><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label={tr('Country', 'البلد')}><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
          <Field label={tr('Account currency', 'عملة الحساب')}>
            <NativeSelect value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Brought by partner', 'أحضره الشريك')}>
            <NativeSelect value={f.ib} onChange={(e) => setF({ ...f, ib: e.target.value })}>
              <option value="">{tr('No partner', 'بدون شريك')}</option>
              {ibs.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{nameOf(i)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Can owe us up to (USD)', 'يمكن أن يدين لنا حتى (دولار)')} help={tr('Leave empty for zero.', 'اتركه فارغًا ليكون صفرًا.')}>
            <Input type="number" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{tr('Cancel', 'إلغاء')}</Button>
          <Button variant="gradient" disabled={!f.name.trim()} onClick={save}>{tr('Add client', 'أضف الزبون')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClientDetail({ client, onClose, onRequest }: { client: ClientRecord | null; onClose: () => void; onRequest: (type: RequestType) => void }) {
  const { tr, nameOf } = useTranslation();
  const updateClient = useBooks((s) => s.updateClient);
  const ibs = useBooks((s) => s.ibs);
  const trades = useBooks((s) => s.trades);
  const requests = useBooks((s) => s.requests);
  const { balances, byCode, entries } = useLedger();
  const recon = useReconciliation();
  const [edit, setEdit] = useState<{ classification: ClientClassification; limit: string; ib: string; notes: string; kyc: ClientRecord['kycStatus'] }>({ classification: 'neutral', limit: '', ib: '', notes: '', kyc: 'missing' });

  useEffect(() => {
    if (client) setEdit({ classification: client.classification, limit: client.creditLimit != null ? String(client.creditLimit) : '', ib: client.ibParentId ?? '', notes: client.notes ?? '', kyc: client.kycStatus ?? 'missing' });
  }, [client]);

  if (!client) return null;
  const acc = byCode.get(client.accountNo);
  const bal = balances[client.accountNo] ?? 0;
  const row = recon.rows.find((r) => r.client.id === client.id);
  const myTrades = trades.filter((t) => t.clientId === client.id);
  const open = myTrades.filter((t) => t.status === 'open');
  const closed = myTrades.filter((t) => t.status === 'closed');
  const result = closed.reduce((s, t) => s + t.profit, 0);
  const myRequests = requests.filter((r) => r.lines.some((l) => l.accountNo === client.accountNo)).slice(0, 6);
  const statement = entries
    .filter((e) => e.lines.some((l) => l.accountCode === client.accountNo))
    .slice(-8).reverse()
    .map((e) => ({ e, change: e.lines.filter((l) => l.accountCode === client.accountNo).reduce((s, l) => s + (acc ? lineEffect(acc, l) : 0), 0) }));

  const save = () => attempt(() => updateClient(client.id, {
    classification: edit.classification, creditLimit: edit.limit ? Number(edit.limit) : undefined,
    ibParentId: edit.ib || undefined, notes: edit.notes || undefined, kycStatus: edit.kyc,
  }), tr('Saved', 'تم الحفظ'));

  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nameOf(client)}</DialogTitle>
          <DialogDescription>
            {client.email ?? ''} {client.country ? `· ${client.country}` : ''} · {tr('MT5 account', 'حساب MT5')} {client.mt5Login}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-primary/5 p-3">
            <p className="text-[11px] text-muted-foreground">{tr('Money with us', 'ماله لدينا')}</p>
            <p className={cn('font-mono text-lg font-bold', bal < 0 && 'text-destructive')} dir="ltr">{fmtMoney(bal, acc?.currency)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground">{tr('MT5 says', 'يقول MT5')}</p>
            <p className="font-mono text-lg font-bold" dir="ltr">{fmtMoney(row?.mt5 ?? 0, acc?.currency)}</p>
            {row && row.status !== 'match' && <p className="text-[11px] text-warning">{row.status === 'check' ? tr('Does not match — check', 'غير مطابق — افحص') : tr('Waiting items', 'عناصر تنتظر')}</p>}
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground">{tr('Trading result', 'نتيجة التداول')}</p>
            <p className={cn('font-mono text-lg font-bold', result >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{fmtMoney(result)}</p>
            <p className="text-[11px] text-muted-foreground">{tr(`${closed.length} closed, ${open.length} open`, `${closed.length} مغلقة، ${open.length} مفتوحة`)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => onRequest('deposit')}><ArrowDownLeft className="h-4 w-4 text-success" />{tr('Add money', 'إضافة مال')}</Button>
          <Button variant="outline" className="gap-1.5" onClick={() => onRequest('withdrawal')}><ArrowUpRight className="h-4 w-4 text-warning" />{tr('Take out money', 'سحب مال')}</Button>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold">{tr('Last changes to their money', 'آخر التغييرات على ماله')}</p>
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
            {statement.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-muted-foreground">{tr('Nothing yet.', 'لا شيء بعد.')}</li>}
            {statement.map(({ e, change }) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                <span className="min-w-0"><span className="block truncate">{e.memo}</span><span className="text-[11px] text-muted-foreground">{e.date} · {tr('entry', 'قيد')} {e.no}</span></span>
                <span className={cn('font-mono font-semibold', change >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{change >= 0 ? '+' : '−'}{fmtMoney(Math.abs(change), acc?.currency)}</span>
              </li>
            ))}
          </ul>
        </div>

        {myRequests.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold">{tr('Their money requests', 'طلبات المال الخاصة به')}</p>
            <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
              {myRequests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]">
                  <span className="font-mono text-[11px] text-muted-foreground">#{r.requestNo}</span>
                  <RequestTypeBadge type={r.type} />
                  <span className="font-mono" dir="ltr">{fmtMoney(r.lines[0]?.amount ?? 0, r.lines[0]?.currency)}</span>
                  <RequestStatusBadge status={r.status} className="ms-auto" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4 rounded-xl border border-border/60 p-4">
          <p className="text-[13px] font-semibold">{tr('Client settings', 'إعدادات الزبون')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Label', 'التصنيف')}>
              <NativeSelect value={edit.classification} onChange={(e) => setEdit({ ...edit, classification: e.target.value as ClientClassification })}>
                {(Object.keys(CLASS_LABEL) as ClientClassification[]).map((k) => <option key={k} value={k}>{tr(CLASS_LABEL[k].en, CLASS_LABEL[k].ar)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('ID documents', 'وثائق الهوية')}>
              <NativeSelect value={edit.kyc} onChange={(e) => setEdit({ ...edit, kyc: e.target.value as ClientRecord['kycStatus'] })}>
                <option value="approved">{tr('Checked and OK', 'تم التحقق')}</option>
                <option value="pending">{tr('Sent, needs checking', 'أُرسلت، تحتاج مراجعة')}</option>
                <option value="missing">{tr('Not sent yet', 'لم تُرسل بعد')}</option>
              </NativeSelect>
            </Field>
            <Field label={tr('Brought by partner', 'أحضره الشريك')}>
              <NativeSelect value={edit.ib} onChange={(e) => setEdit({ ...edit, ib: e.target.value })}>
                <option value="">{tr('No partner', 'بدون شريك')}</option>
                {ibs.map((i) => <option key={i.id} value={i.id}>{nameOf(i)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Can owe us up to', 'يمكن أن يدين لنا حتى')}>
              <Input type="number" value={edit.limit} onChange={(e) => setEdit({ ...edit, limit: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <Field label={tr('Notes', 'ملاحظات')}><TextArea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px]">
              <Toggle checked={client.active} onChange={(v) => updateClient(client.id, { active: v })} />
              {client.active ? tr('Active', 'نشط') : tr('Turned off', 'متوقف')}
            </label>
            <Button variant="gradient" onClick={save}>{tr('Save', 'حفظ')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const { tr, nameOf } = useTranslation();
  const clients = useBooks((s) => s.clients);
  const ibs = useBooks((s) => s.ibs);
  const { balances, byCode, cat } = useLedger();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(params.get('new') === '1');
  const [openId, setOpenId] = useState<string | null>(null);
  const [requestFor, setRequestFor] = useState<{ account: string; type: RequestType } | null>(null);

  useEffect(() => {
    const acc = params.get('account');
    if (acc) { const c = clients.find((x) => x.accountNo === acc); if (c) setOpenId(c.id); }
    if (params.get('new') === '1') setAddOpen(true);
  }, [params, clients]);

  const active = clients.filter((c) => c.active);
  const owe = active.filter((c) => (balances[c.accountNo] ?? 0) < 0);
  const docs = active.filter((c) => c.kycStatus !== 'approved');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter === 'good' && c.classification !== 'good') return false;
      if (filter === 'careful' && c.classification !== 'bad' && c.classification !== 'fraud') return false;
      if (filter === 'docs' && c.kycStatus === 'approved') return false;
      if (filter === 'owe' && (balances[c.accountNo] ?? 0) >= 0) return false;
      if (!q) return true;
      return [c.name, c.arabic, c.accountNo, c.email, c.mt5Login, c.country].some((v) => v?.toLowerCase().includes(q));
    }).sort((a, b) => Number(b.active) - Number(a.active) || (balances[b.accountNo] ?? 0) - (balances[a.accountNo] ?? 0));
  }, [clients, filter, search, balances]);

  const openClient = clients.find((c) => c.id === openId) ?? null;
  const closeDetail = () => { setOpenId(null); const p = new URLSearchParams(params); p.delete('account'); setParams(p, { replace: true }); };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Clients', 'الزبائن')}
        subtitle={tr('Everyone who trades with you, and how much money they keep with you.', 'كل من يتداول معك، وكم يحفظ لديك من المال.')}
        hint={
          <PageHint id="clients-v2" title={tr('What is on this page?', 'ماذا في هذه الصفحة؟')}>
            {tr('Click a client to see their money, trades and history. Use "Add money" or "Take out money" to start a money request for them.', 'اضغط على زبون لترى ماله وصفقاته وسجله. استخدم "إضافة مال" أو "سحب مال" لبدء طلب مال له.')}
          </PageHint>
        }
        actions={<Button variant="gradient" className="gap-1.5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />{tr('Add a client', 'أضف زبونًا')}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Active clients', 'الزبائن النشطون')} value={active.length} icon={Users} accent="blue" deltaLabel={tr(`${clients.length - active.length} turned off`, `${clients.length - active.length} متوقف`)} />
        <StatCard label={tr('Their money with you', 'أموالهم لديك')} value={fmtShort(cat.clients)} icon={Wallet} accent="violet" deltaLabel={tr('You must give this back when they ask', 'يجب أن تعيده عندما يطلبونه')} />
        <StatCard label={tr('Owe you money', 'مدينون لك')} value={owe.length} icon={AlertTriangle} accent="pink" deltaLabel={tr('Balance is below zero', 'الرصيد أقل من صفر')} onClick={() => setFilter('owe')} />
        <StatCard label={tr('Need ID check', 'تحتاج تحقق الهوية')} value={docs.length} icon={FileWarning} accent="amber" deltaLabel={tr('Check their documents', 'راجع وثائقهم')} onClick={() => setFilter('docs')} />
      </div>

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search by name, email or MT5 number…', 'ابحث بالاسم أو البريد أو رقم MT5…')} className="ps-9" />
          </div>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: tr('All', 'الكل') },
              { value: 'good', label: tr('Good', 'جيد') },
              { value: 'careful', label: tr('Be careful', 'انتبه') },
              { value: 'docs', label: tr('Need ID', 'تحتاج هوية'), count: docs.length },
              { value: 'owe', label: tr('Owe us', 'مدينون'), count: owe.length },
            ]}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Client', 'الزبون')}</TableHead>
              <TableHead className="hidden lg:table-cell">{tr('Partner', 'الشريك')}</TableHead>
              <TableHead className="hidden md:table-cell">{tr('ID', 'الهوية')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tr('Label', 'التصنيف')}</TableHead>
              <TableHead className="text-end">{tr('Money with us', 'ماله لدينا')}</TableHead>
              <TableHead className="hidden text-end xl:table-cell">{tr('Quick', 'سريع')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const bal = balances[c.accountNo] ?? 0;
              const acc = byCode.get(c.accountNo);
              const cl = CLASS_LABEL[c.classification];
              return (
                <TableRow key={c.id} className={cn('cursor-pointer', !c.active && 'opacity-50')} onClick={() => setOpenId(c.id)}>
                  <TableCell>
                    <p className="font-medium">{nameOf(c)}</p>
                    <p className="text-[11px] text-muted-foreground">MT5 {c.mt5Login} · {c.country}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {c.ibParentId ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{nameOf(ibs.find((i) => i.id === c.ibParentId))}</span> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><KycBadge status={c.kycStatus} /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant={cl.tone}>{tr(cl.en, cl.ar)}</Badge></TableCell>
                  <TableCell className={cn('text-end font-mono text-sm font-semibold', bal < 0 && 'text-destructive')} dir="ltr">{fmtMoney(bal, acc?.currency)}</TableCell>
                  <TableCell className="hidden text-end xl:table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="xs" variant="outline" onClick={() => setRequestFor({ account: c.accountNo, type: 'deposit' })}>{tr('Add', 'إضافة')}</Button>
                      <Button size="xs" variant="outline" onClick={() => setRequestFor({ account: c.accountNo, type: 'withdrawal' })}>{tr('Take out', 'سحب')}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && <p className="px-6 py-12 text-center text-[13px] text-muted-foreground">{tr('No client matches. Try another word.', 'لا يوجد زبون مطابق. جرّب كلمة أخرى.')}</p>}
      </SectionCard>

      <AddClientDialog open={addOpen} onClose={() => { setAddOpen(false); const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }); }} />
      <ClientDetail client={openClient} onClose={closeDetail} onRequest={(type) => { if (openClient) { setRequestFor({ account: openClient.accountNo, type }); closeDetail(); } }} />
      <NewRequestDialog open={!!requestFor} presetAccount={requestFor?.account} presetType={requestFor?.type} onClose={() => setRequestFor(null)} />
    </div>
  );
}
