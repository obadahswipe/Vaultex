import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet, Landmark, Handshake, ArrowLeftRight, Coins } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, attempt } from '@/components/shared/form';
import { NewRequestDialog } from '@/components/operations/NewRequestDialog';
import { useBooks } from '@/stores/books.store';
import { useLedger } from '@/lib/data/hooks';
import { CATEGORY_LABEL } from '@/lib/data/labels';
import { fmtMoney, fmtUSD, fmtShort, round2 } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { CURRENCIES, type Account, type Category, type Currency } from '@/lib/data/types';

function AddPlaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tr, nameOf } = useTranslation();
  const accounts = useBooks((s) => s.accounts);
  const branches = useBooks((s) => s.branches);
  const addAccount = useBooks((s) => s.addAccount);
  const [f, setF] = useState({ kind: 'funds' as Category, name: '', arabic: '', currency: 'USD' as Currency, branch: '' });
  const save = () => {
    const prefix = f.kind === 'funds' ? '11' : f.kind === 'banks' ? '12' : '13';
    const nums = accounts.filter((a) => a.code.startsWith(prefix) && a.code.length === 4).map((a) => Number(a.code));
    const code = String((nums.length ? Math.max(...nums) : Number(prefix + '00')) + 1);
    const ok = attempt(() => addAccount({ code, name: f.name.trim(), arabic: f.arabic.trim() || f.name.trim(), category: f.kind, currency: f.currency, opening: 0, branchId: f.branch || undefined }), tr('Added', 'تمت الإضافة'));
    if (ok) { onClose(); setF({ kind: 'funds', name: '', arabic: '', currency: 'USD', branch: '' }); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tr('Add a money place', 'أضف مكانًا للمال')}</DialogTitle>
          <DialogDescription>{tr('A cash box, a bank account, or a money partner.', 'صندوق نقدي أو حساب بنكي أو شريك مالي.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr('What is it?', 'ما هو؟')}>
            <NativeSelect value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Category })}>
              {(['funds', 'banks', 'suppliers'] as Category[]).map((c) => <option key={c} value={c}>{tr(CATEGORY_LABEL[c].en, CATEGORY_LABEL[c].ar)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Currency', 'العملة')}>
            <NativeSelect value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={tr('e.g. Bank Al Noor (USD)', 'مثال: بنك النور (دولار)')} /></Field>
          <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={f.arabic} onChange={(e) => setF({ ...f, arabic: e.target.value })} /></Field>
          <Field label={tr('Branch', 'الفرع')}>
            <NativeSelect value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })}>
              <option value="">{tr('Not linked', 'غير مرتبط')}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{nameOf({ name: b.name, arabic: b.arabic })}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{tr('Cancel', 'إلغاء')}</Button>
          <Button variant="gradient" disabled={!f.name.trim()} onClick={save}>{tr('Add', 'أضف')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Treasury() {
  const { tr, nameOf } = useTranslation();
  const navigate = useNavigate();
  const branches = useBooks((s) => s.branches);
  const { accounts, balances, usd, cat, rates } = useLedger();
  const [addOpen, setAddOpen] = useState(false);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const places = accounts.filter((a) => (a.category === 'funds' || a.category === 'banks' || a.category === 'suppliers') && a.active);
  const byCurrency = useMemo(() => {
    const m = new Map<Currency, { native: number; usd: number }>();
    for (const a of places.filter((p) => p.category !== 'suppliers')) {
      const r = m.get(a.currency) ?? { native: 0, usd: 0 };
      r.native += balances[a.code] ?? 0; r.usd += usd[a.code] ?? 0;
      m.set(a.currency, r);
    }
    return [...m.entries()].map(([c, v]) => ({ currency: c, native: round2(v.native), usd: round2(v.usd) })).sort((a, b) => b.usd - a.usd);
  }, [places, balances, usd]);
  const cashUsd = byCurrency.reduce((s, r) => s + r.usd, 0);

  const group = (c: Category) => places.filter((a) => a.category === c);
  const branchName = (id?: string) => { const b = branches.find((x) => x.id === id); return b ? nameOf({ name: b.name, arabic: b.arabic }) : ''; };

  const Row = ({ a }: { a: Account }) => {
    const bal = balances[a.code] ?? 0;
    return (
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30">
        <button className="min-w-0 flex-1 text-start" onClick={() => navigate(`/entries?account=${a.code}`)}>
          <p className="truncate text-[14px] font-medium">{nameOf(a)}</p>
          <p className="text-[11px] text-muted-foreground">{a.currency}{a.branchId ? ` · ${branchName(a.branchId)}` : ''}</p>
        </button>
        <div className="text-end">
          <p className={cn('font-mono text-[14px] font-semibold', bal < 0 && 'text-destructive')} dir="ltr">{fmtMoney(bal, a.currency)}</p>
          {a.currency !== 'USD' && <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">≈ {fmtUSD(usd[a.code] ?? 0)}</p>}
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" title={tr('Move money from here', 'انقل المال من هنا')} onClick={() => setMoveFrom(a.code)}>
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Banks and cash', 'البنوك والصناديق')}
        subtitle={tr('How much money you have, and where it is.', 'كم لديك من المال، وأين هو.')}
        hint={
          <PageHint id="treasury-v2" title={tr('Good to know', 'معلومة مفيدة')}>
            {tr('Money in other currencies is shown in dollars at today’s rate. Use the ⇄ button to move money between a bank and a cash box.', 'المال بالعملات الأخرى يظهر بالدولار حسب سعر اليوم. استخدم زر ⇄ لنقل المال بين بنك وصندوق.')}
          </PageHint>
        }
        actions={<Button variant="gradient" className="gap-1.5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />{tr('Add a money place', 'أضف مكانًا للمال')}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Money you can use', 'المال الذي يمكنك استخدامه')} value={fmtShort(cashUsd)} icon={Coins} accent="blue" deltaLabel={tr('Cash boxes + banks', 'الصناديق + البنوك')} />
        <StatCard label={tr('In cash boxes', 'في الصناديق')} value={fmtShort(cat.funds)} icon={Wallet} accent="amber" deltaLabel={tr(`${group('funds').length} cash boxes`, `${group('funds').length} صناديق`)} />
        <StatCard label={tr('In banks', 'في البنوك')} value={fmtShort(cat.banks)} icon={Landmark} accent="violet" deltaLabel={tr(`${group('banks').length} bank accounts`, `${group('banks').length} حسابات بنكية`)} />
        <StatCard label={tr('With money partners', 'لدى شركاء المال')} value={fmtShort(cat.suppliers)} icon={Handshake} accent="green" deltaLabel={tr('Trading and transfer partners', 'شركاء التداول والحوالات')} />
      </div>

      <SectionCard title={tr('By currency', 'حسب العملة')} description={tr('Cash boxes and banks together.', 'الصناديق والبنوك معًا.')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {byCurrency.map((r) => (
            <div key={r.currency} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-muted px-2 py-0.5 font-mono text-[12px] font-bold">{r.currency}</span>
                <span className="text-[11px] text-muted-foreground">{cashUsd > 0 ? Math.round((r.usd / cashUsd) * 100) : 0}%</span>
              </div>
              <p className="mt-2 font-mono text-lg font-bold" dir="ltr">{fmtMoney(r.native, r.currency, { decimals: 0 })}</p>
              {r.currency !== 'USD' && <p className="text-[12px] text-muted-foreground" dir="ltr">≈ {fmtUSD(r.usd)} · 1 {r.currency} = {rates[r.currency].toFixed(4)} USD</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {(['funds', 'banks'] as Category[]).map((c) => (
          <SectionCard key={c} padded={false} title={tr(CATEGORY_LABEL[c].en, CATEGORY_LABEL[c].ar)} description={tr(CATEGORY_LABEL[c].helpEn, CATEGORY_LABEL[c].helpAr)} action={<span className="font-mono font-bold">{fmtUSD(cat[c])}</span>}>
            <div className="divide-y divide-border/40">{group(c).map((a) => <Row key={a.code} a={a} />)}</div>
          </SectionCard>
        ))}
      </div>

      <SectionCard padded={false} title={tr(CATEGORY_LABEL.suppliers.en, CATEGORY_LABEL.suppliers.ar)} description={tr(CATEGORY_LABEL.suppliers.helpEn, CATEGORY_LABEL.suppliers.helpAr)} action={<span className="font-mono font-bold">{fmtUSD(cat.suppliers)}</span>}>
        <div className="divide-y divide-border/40">{group('suppliers').map((a) => <Row key={a.code} a={a} />)}</div>
      </SectionCard>

      <AddPlaceDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <NewRequestDialog open={!!moveFrom} presetAccount={moveFrom ?? undefined} presetType="transfer_from" onClose={() => setMoveFrom(null)} />
    </div>
  );
}
