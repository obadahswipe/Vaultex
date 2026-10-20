import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Lock, Undo2, Download, X, Trash2, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Segmented, attempt } from '@/components/shared/form';
import { AccountPicker } from '@/components/shared/AccountPicker';
import { LedgerPreview } from '@/components/operations/LedgerPreview';
import { useBooks } from '@/stores/books.store';
import { useActingUser, useLedger } from '@/lib/data/hooks';
import { entryTotalsUSD, lineEffect } from '@/lib/data/ledger';
import { ENTRY_KIND_LABEL } from '@/lib/data/labels';
import { fmtMoney, fmtUSD, round2 } from '@/lib/data/money';
import { daysAgo } from '@/lib/data/seed';
import { downloadCsv } from '@/lib/csv';
import { canPostEntries } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { CATEGORIES, type EntryKind, type LedgerLine } from '@/lib/data/types';

type Range = 'today' | 'month' | '30d' | 'all';

function ManualEntryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tr } = useTranslation();
  const postEntry = useBooks((s) => s.postEntry);
  const closedThrough = useBooks((s) => s.closedThrough);
  const me = useActingUser();
  const { byCode, rates } = useLedger();
  const blank = () => ({ code: '', debit: '', credit: '' });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [rows, setRows] = useState([blank(), blank()]);
  useEffect(() => { if (open) { setRows([blank(), blank()]); setMemo(''); setDate(new Date().toISOString().slice(0, 10)); } }, [open]);

  const lines: LedgerLine[] = rows
    .filter((r) => r.code && (Number(r.debit) > 0 || Number(r.credit) > 0))
    .map((r) => {
      const acc = byCode.get(r.code)!;
      return { accountCode: r.code, debit: Number(r.debit) || 0, credit: Number(r.credit) || 0, currency: acc.currency, rate: rates[acc.currency] ?? 1 };
    });
  const totals = entryTotalsUSD({ lines });
  const diff = round2(totals.debit - totals.credit);

  const save = () => {
    const ok = attempt(() => postEntry({ date, memo: memo || tr('Entry written by hand', 'قيد يدوي'), kind: 'manual', lines, by: me.email }), tr('The entry is in the books', 'تم تسجيل القيد في الدفاتر'));
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr('Write an entry by hand', 'سجّل قيدًا يدويًا')}</DialogTitle>
          <DialogDescription>
            {tr('Money always comes from one place and goes to another, so both sides must be equal. Debit makes cash, banks and costs go up. Credit makes clients’ money, income and owners’ money go up.', 'المال يأتي دائمًا من مكان ويذهب إلى آخر، لذلك يجب أن يتساوى الجانبان. المدين يزيد النقد والبنوك والمصاريف. والدائن يزيد أموال الزبائن والدخل وأموال المالكين.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr('Date', 'التاريخ')} help={tr(`Days up to ${closedThrough} are closed.`, `الأيام حتى ${closedThrough} مغلقة.`)}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={tr('What is it for?', 'ما سببه؟')}><Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={tr('e.g. Fix a typing mistake', 'مثال: تصحيح خطأ في الكتابة')} /></Field>
        </div>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_110px_110px_32px] gap-2 px-1 text-[11px] font-semibold text-muted-foreground sm:grid">
            <span>{tr('Account', 'الحساب')}</span><span>{tr('Debit', 'مدين')}</span><span>{tr('Credit', 'دائن')}</span><span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_110px_110px_32px]">
              <div className="col-span-2 sm:col-span-1">
                <AccountPicker value={r.code} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, code: v } : x)))} categories={CATEGORIES} />
              </div>
              <Input type="number" placeholder={tr('Debit', 'مدين')} value={r.debit} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, debit: e.target.value, credit: '' } : x)))} />
              <Input type="number" placeholder={tr('Credit', 'دائن')} value={r.credit} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, credit: e.target.value, debit: '' } : x)))} />
              <Button variant="ghost" size="icon" className="h-10 w-8" disabled={rows.length <= 2} onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setRows([...rows, blank()])}><Plus className="h-3.5 w-3.5" />{tr('Add a line', 'أضف سطرًا')}</Button>
        </div>
        {lines.length > 0 && (
          <div className="space-y-2">
            <LedgerPreview lines={lines} />
            <p className={cn('rounded-xl px-3 py-2 text-[13px] font-medium', Math.abs(diff) < 0.01 ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning')}>
              {Math.abs(diff) < 0.01
                ? tr(`Both sides are equal: ${fmtUSD(totals.debit, 2)}`, `الجانبان متساويان: ${fmtUSD(totals.debit, 2)}`)
                : tr(`The sides are not equal yet. Difference: ${fmtUSD(Math.abs(diff), 2)}`, `الجانبان غير متساويين بعد. الفرق: ${fmtUSD(Math.abs(diff), 2)}`)}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{tr('Cancel', 'إلغاء')}</Button>
          <Button variant="gradient" disabled={lines.length < 2 || Math.abs(diff) >= 0.01} onClick={save}>{tr('Write it in the books', 'سجّله في الدفاتر')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Entries() {
  const { tr, nameOf } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { entries, accounts, byCode, balances } = useLedger();
  const closedThrough = useBooks((s) => s.closedThrough);
  const reverseEntry = useBooks((s) => s.reverseEntry);
  const users = useBooks((s) => s.users);
  const me = useActingUser();
  const [range, setRange] = useState<Range>('month');
  const [kind, setKind] = useState<EntryKind | 'all'>('all');
  const [search, setSearch] = useState(params.get('no') ?? '');
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(params.get('new') === '1');
  const account = params.get('account') ?? '';
  const acc = account ? byCode.get(account) : undefined;

  useEffect(() => { if (params.get('new') === '1') setNewOpen(true); if (params.get('no')) setSearch(params.get('no')!); }, [params]);

  const today = new Date().toISOString().slice(0, 10);
  const from = range === 'today' ? today : range === 'month' ? today.slice(0, 8) + '01' : range === '30d' ? daysAgo(30) : '0000';

  const list = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^v-?/, '');
    return entries
      .filter((e) => e.date >= from)
      .filter((e) => kind === 'all' || e.kind === kind)
      .filter((e) => !account || e.lines.some((l) => l.accountCode === account))
      .filter((e) => !q || String(e.no) === q || e.memo.toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [entries, from, kind, account, search]);

  // Statement view for one account (oldest first, with running balance)
  const statement = useMemo(() => {
    if (!acc) return null;
    const before = entries.filter((e) => e.date < from);
    let running = acc.opening;
    for (const e of before) for (const l of e.lines) if (l.accountCode === acc.code) running += lineEffect(acc, l);
    const start = round2(running);
    const rows = entries.filter((e) => e.date >= from && e.lines.some((l) => l.accountCode === acc.code)).map((e) => {
      const change = round2(e.lines.filter((l) => l.accountCode === acc.code).reduce((s, l) => s + lineEffect(acc, l), 0));
      running = round2(running + change);
      return { e, change, after: running };
    });
    return { start, rows: rows.reverse(), end: balances[acc.code] ?? 0 };
  }, [acc, entries, from, balances]);

  const who = (email: string) => users.find((u) => u.email === email)?.name ?? (email === 'system' ? tr('Vaultex (automatic)', 'فولتكس (تلقائي)') : email);
  const reversed = new Set(entries.filter((e) => e.ref?.startsWith('reverse:')).map((e) => e.ref!.slice(8)));

  const exportCsv = () => {
    const rows = list.flatMap((e) => e.lines.map((l) => ({
      entry: e.no, date: e.date, memo: e.memo, account: l.accountCode, name: byCode.get(l.accountCode)?.name ?? '', currency: l.currency, debit: l.debit, credit: l.credit, usd_rate: l.rate,
    })));
    downloadCsv(`vaultex-entries-${today}.csv`, rows);
  };

  const clearAccount = () => { const p = new URLSearchParams(params); p.delete('account'); setParams(p, { replace: true }); };

  return (
    <div className="space-y-8">
      <PageHeader
        title={acc ? tr(`Statement: ${acc.name}`, `كشف حساب: ${acc.arabic}`) : tr('Entries', 'القيود')}
        subtitle={acc
          ? tr('Every change to this account, newest first, with the balance after each one.', 'كل تغيير على هذا الحساب، الأحدث أولًا، مع الرصيد بعد كل تغيير.')
          : tr('Every time money moved, it is written here with a number you can quote.', 'كل مرة تحرك فيها المال، يُكتب هنا برقم يمكنك ذكره.')}
        hint={!acc && (
          <PageHint id="entries-v2" title={tr('What is an entry?', 'ما هو القيد؟')}>
            {tr('An entry is a short note in the books: which accounts went up and which went down. Click an entry to see it. Days that are closed have a lock and cannot change. To fix a mistake, press "Undo" — Vaultex adds a new entry that cancels the old one, so nothing is ever erased.', 'القيد ملاحظة قصيرة في الدفاتر: أي الحسابات زادت وأيها نقصت. اضغط على قيد لتراه. الأيام المغلقة عليها قفل ولا تتغير. لتصحيح خطأ اضغط "تراجع" — يضيف فولتكس قيدًا جديدًا يلغي القديم، فلا يُمسح شيء أبدًا.')}
          </PageHint>
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={exportCsv}><Download className="h-4 w-4" />{tr('Download (Excel)', 'تنزيل (إكسل)')}</Button>
            {canPostEntries(me.role) && <Button variant="gradient" className="gap-1.5" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />{tr('Write an entry', 'سجّل قيدًا')}</Button>}
          </div>
        }
      />

      {acc && statement && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-elevated p-5"><p className="text-[12px] text-muted-foreground">{tr('At the start', 'في البداية')}</p><p className="mt-1 font-mono text-xl font-bold" dir="ltr">{fmtMoney(statement.start, acc.currency)}</p></div>
          <div className="card-elevated p-5"><p className="text-[12px] text-muted-foreground">{tr('Changes', 'التغييرات')}</p><p className="mt-1 text-xl font-bold">{statement.rows.length}</p></div>
          <div className="card-elevated p-5"><p className="text-[12px] text-muted-foreground">{tr('Now', 'الآن')}</p><p className="mt-1 font-mono text-xl font-bold" dir="ltr">{fmtMoney(statement.end, acc.currency)}</p></div>
        </div>
      )}

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Segmented<Range> value={range} onChange={setRange} options={[
            { value: 'today', label: tr('Today', 'اليوم') },
            { value: 'month', label: tr('This month', 'هذا الشهر') },
            { value: '30d', label: tr('30 days', '30 يومًا') },
            { value: 'all', label: tr('All', 'الكل') },
          ]} />
          {!acc && (
            <>
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Entry number or words…', 'رقم القيد أو كلمات…')} className="ps-9" />
              </div>
              <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as EntryKind | 'all')} className="w-auto min-w-[150px]">
                <option value="all">{tr('All kinds', 'كل الأنواع')}</option>
                {(Object.keys(ENTRY_KIND_LABEL) as EntryKind[]).map((k) => <option key={k} value={k}>{tr(ENTRY_KIND_LABEL[k].en, ENTRY_KIND_LABEL[k].ar)}</option>)}
              </NativeSelect>
            </>
          )}
          <div className="w-full sm:w-64">
            <NativeSelect value={account} onChange={(e) => { const p = new URLSearchParams(params); if (e.target.value) p.set('account', e.target.value); else p.delete('account'); setParams(p, { replace: true }); }}>
              <option value="">{tr('All accounts', 'كل الحسابات')}</option>
              {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {nameOf(a)}</option>)}
            </NativeSelect>
          </div>
          {acc && <Button variant="ghost" size="sm" className="gap-1" onClick={clearAccount}><X className="h-3.5 w-3.5" />{tr('Show all entries', 'اعرض كل القيود')}</Button>}
        </div>

        {acc && statement ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('Date', 'التاريخ')}</TableHead>
                <TableHead>{tr('What happened', 'ماذا حدث')}</TableHead>
                <TableHead className="text-end">{tr('Change', 'التغيير')}</TableHead>
                <TableHead className="text-end">{tr('Balance after', 'الرصيد بعدها')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.rows.map(({ e, change, after }) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-[13px]">{e.date}{e.date <= closedThrough && <Lock className="ms-1 inline h-3 w-3 text-muted-foreground" />}</TableCell>
                  <TableCell><p className="text-[13px]">{e.memo}</p><p className="text-[11px] text-muted-foreground">{tr('Entry', 'قيد')} {e.no}</p></TableCell>
                  <TableCell className={cn('text-end font-mono font-semibold', change >= 0 ? 'text-success' : 'text-destructive')} dir="ltr">{change >= 0 ? '+' : '−'}{fmtMoney(Math.abs(change), acc.currency)}</TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{fmtMoney(after, acc.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{tr('No.', 'رقم')}</TableHead>
                <TableHead>{tr('What happened', 'ماذا حدث')}</TableHead>
                <TableHead className="hidden md:table-cell">{tr('Kind', 'النوع')}</TableHead>
                <TableHead className="text-end">{tr('Amount (USD)', 'المبلغ (دولار)')}</TableHead>
                <TableHead className="hidden lg:table-cell">{tr('By', 'بواسطة')}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.slice(0, 300).map((e) => {
                const t = entryTotalsUSD(e);
                const isOpen = openId === e.id;
                const locked = e.date <= closedThrough;
                return (
                  <Fragment key={e.id}>
                    <TableRow className="cursor-pointer" onClick={() => setOpenId(isOpen ? null : e.id)}>
                      <TableCell className="font-mono text-xs">{e.no}{locked && <Lock className="ms-1 inline h-3 w-3 text-muted-foreground" />}</TableCell>
                      <TableCell><p className="text-[13px] font-medium">{e.memo}</p><p className="text-[11px] text-muted-foreground">{e.date}</p></TableCell>
                      <TableCell className="hidden text-[12px] md:table-cell">{tr(ENTRY_KIND_LABEL[e.kind].en, ENTRY_KIND_LABEL[e.kind].ar)}</TableCell>
                      <TableCell className="text-end font-mono" dir="ltr">{fmtUSD(t.debit, 2)}</TableCell>
                      <TableCell className="hidden text-[12px] text-muted-foreground lg:table-cell">{who(e.createdBy)}</TableCell>
                      <TableCell><ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} /></TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={6}>
                          <div className="space-y-3 py-1">
                            <LedgerPreview lines={e.lines} />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
                              <span>{tr(`Written by ${who(e.createdBy)} on ${new Date(e.createdAt).toLocaleString('en-GB')}`, `كتبه ${who(e.createdBy)} في ${new Date(e.createdAt).toLocaleString('ar')}`)}</span>
                              {canPostEntries(me.role) && !e.ref?.startsWith('reverse:') && (
                                reversed.has(e.id)
                                  ? <span className="font-medium">{tr('Already undone', 'تم التراجع عنه')}</span>
                                  : <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                                      if (window.confirm(tr('Undo this entry? Vaultex will add a new entry that cancels it.', 'هل تريد التراجع عن هذا القيد؟ سيضيف فولتكس قيدًا جديدًا يلغيه.'))) {
                                        attempt(() => { reverseEntry(e.id, me.email); }, tr('Done. A new entry cancels the old one.', 'تم. قيد جديد يلغي القيد القديم.'));
                                      }
                                    }}><Undo2 className="h-3.5 w-3.5" />{tr('Undo', 'تراجع')}</Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
        {(acc ? statement?.rows.length === 0 : list.length === 0) && <p className="px-6 py-12 text-center text-[13px] text-muted-foreground">{tr('No entries in this time.', 'لا قيود في هذه الفترة.')}</p>}
      </SectionCard>

      <ManualEntryDialog open={newOpen} onClose={() => { setNewOpen(false); const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }); }} />
    </div>
  );
}
