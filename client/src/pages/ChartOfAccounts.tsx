import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Toggle, attempt } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useActingUser, useLedger } from '@/lib/data/hooks';
import { CATEGORY_LABEL } from '@/lib/data/labels';
import { fmtMoney, fmtUSD } from '@/lib/data/money';
import { downloadCsv } from '@/lib/csv';
import { canManageSettings } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { CATEGORIES, CURRENCIES, type Account, type Category, type Currency } from '@/lib/data/types';

const PREFIX: Record<Category, string> = {
  funds: '11', banks: '12', suppliers: '13', staff: '14', fixed: '15',
  clients: '21', ibs: '22', debts: '23', partners: '31', revenue: '41', expenses: '51',
};

function AccountDialog({ account, open, onClose, defaultCat }: { account?: Account; open: boolean; onClose: () => void; defaultCat: Category }) {
  const { tr } = useTranslation();
  const accounts = useBooks((s) => s.accounts);
  const addAccount = useBooks((s) => s.addAccount);
  const updateAccount = useBooks((s) => s.updateAccount);
  const [f, setF] = useState({ category: defaultCat, name: '', arabic: '', currency: 'USD' as Currency, limit: '' });
  useEffect(() => {
    if (!open) return;
    setF(account
      ? { category: account.category, name: account.name, arabic: account.arabic, currency: account.currency, limit: account.creditLimit != null ? String(account.creditLimit) : '' }
      : { category: defaultCat, name: '', arabic: '', currency: 'USD', limit: '' });
  }, [open, account, defaultCat]);

  const save = () => {
    let ok: boolean;
    if (account) {
      ok = attempt(() => updateAccount(account.code, { name: f.name, arabic: f.arabic, creditLimit: f.limit ? Number(f.limit) : undefined }), tr('Saved', 'تم الحفظ'));
    } else {
      const prefix = PREFIX[f.category];
      const nums = accounts.filter((a) => a.code.startsWith(prefix) && a.code.length === 4).map((a) => Number(a.code));
      const code = String((nums.length ? Math.max(...nums) : Number(prefix + '00')) + 1);
      ok = attempt(() => addAccount({ code, name: f.name.trim(), arabic: f.arabic.trim() || f.name.trim(), category: f.category, currency: f.currency, opening: 0 }), tr(`Account ${code} added`, `تمت إضافة الحساب ${code}`));
    }
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? tr('Edit account', 'تعديل الحساب') : tr('Add an account', 'أضف حسابًا')}</DialogTitle>
          <DialogDescription>{tr('New accounts start at zero. Money comes in through requests and entries.', 'الحسابات الجديدة تبدأ من صفر. ويدخلها المال عبر الطلبات والقيود.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr('Kind', 'النوع')}>
            <NativeSelect value={f.category} disabled={!!account} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{tr(CATEGORY_LABEL[c].en, CATEGORY_LABEL[c].ar)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Currency', 'العملة')}>
            <NativeSelect value={f.currency} disabled={!!account} onChange={(e) => setF({ ...f, currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={f.arabic} onChange={(e) => setF({ ...f, arabic: e.target.value })} /></Field>
          {(f.category === 'clients' || f.category === 'staff') && (
            <Field label={tr('Can go below zero by', 'يمكن أن ينزل تحت الصفر بمقدار')}><Input type="number" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></Field>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{tr('Cancel', 'إلغاء')}</Button>
          <Button variant="gradient" disabled={!f.name.trim()} onClick={save}>{tr('Save', 'حفظ')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChartOfAccounts() {
  const { tr, nameOf } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { accounts, balances, usd, cat } = useLedger();
  const updateAccount = useBooks((s) => s.updateAccount);
  const me = useActingUser();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; account?: Account }>({ open: false });
  const selected = (params.get('cat') as Category | null) ?? 'all';

  const shown = selected === 'all' ? CATEGORIES : [selected];
  const q = search.trim().toLowerCase();
  const rows = (c: Category) => accounts.filter((a) => a.category === c && (!q || a.code.includes(q) || a.name.toLowerCase().includes(q) || a.arabic.includes(q)));

  const pick = (c: Category | 'all') => {
    const p = new URLSearchParams(params);
    if (c === 'all') p.delete('cat'); else p.set('cat', c);
    setParams(p, { replace: true });
  };

  const exportCsv = () => downloadCsv('vaultex-accounts.csv', accounts.map((a) => ({
    code: a.code, name: a.name, arabic: a.arabic, kind: CATEGORY_LABEL[a.category].en, currency: a.currency,
    first_day: a.opening, now: balances[a.code] ?? 0, now_usd: usd[a.code] ?? 0, active: a.active,
  })));

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Accounts', 'الحسابات')}
        subtitle={tr('Every account in your books, grouped by kind. Click one to see its statement.', 'كل حساب في دفاترك، مجمّع حسب النوع. اضغط على حساب لترى كشفه.')}
        hint={
          <PageHint id="coa-v2" title={tr('The 3 big groups', 'المجموعات الثلاث الكبيرة')}>
            {tr('What you own (cash, banks…) = what you owe (clients’ money, bills…) + the owners’ money. Vaultex keeps both sides equal every time money moves.', 'ما تملكه (النقد والبنوك…) = ما عليك (أموال الزبائن والفواتير…) + أموال المالكين. فولتكس يُبقي الجانبين متساويين كل مرة يتحرك فيها المال.')}
          </PageHint>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={exportCsv}><Download className="h-4 w-4" />{tr('Download', 'تنزيل')}</Button>
            {canManageSettings(me.role) && <Button variant="gradient" className="gap-1.5" onClick={() => setDialog({ open: true })}><Plus className="h-4 w-4" />{tr('Add an account', 'أضف حسابًا')}</Button>}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => pick('all')} className={cn('rounded-xl border px-3 py-1.5 text-[13px] font-medium', selected === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border/60 bg-card hover:bg-accent/60')}>
          {tr('All', 'الكل')}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => pick(c)} className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-medium', selected === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border/60 bg-card hover:bg-accent/60')}>
            <span className={cn('h-2 w-2 rounded-full', CATEGORY_LABEL[c].color)} />
            {tr(CATEGORY_LABEL[c].en, CATEGORY_LABEL[c].ar)}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search accounts…', 'ابحث في الحسابات…')} className="ps-9" />
      </div>

      {shown.map((c) => {
        const list = rows(c);
        if (!list.length) return null;
        return (
          <SectionCard
            key={c}
            padded={false}
            title={<span className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', CATEGORY_LABEL[c].color)} />{tr(CATEGORY_LABEL[c].en, CATEGORY_LABEL[c].ar)}</span>}
            description={tr(CATEGORY_LABEL[c].helpEn, CATEGORY_LABEL[c].helpAr)}
            action={<span className="font-mono font-bold">{fmtUSD(cat[c])}</span>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{tr('No.', 'رقم')}</TableHead>
                  <TableHead>{tr('Name', 'الاسم')}</TableHead>
                  <TableHead className="hidden text-end md:table-cell">{tr('First day', 'اليوم الأول')}</TableHead>
                  <TableHead className="text-end">{tr('Now', 'الآن')}</TableHead>
                  <TableHead className="hidden text-end sm:table-cell">{tr('In USD', 'بالدولار')}</TableHead>
                  <TableHead className="hidden w-16 text-center lg:table-cell">{tr('On', 'نشط')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a) => {
                  const bal = balances[a.code] ?? 0;
                  return (
                    <TableRow key={a.code} className={cn('cursor-pointer', !a.active && 'opacity-50')} onClick={() => navigate(`/entries?account=${a.code}`)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.code}</TableCell>
                      <TableCell><p className="font-medium">{nameOf(a)}</p><p className="text-[11px] text-muted-foreground">{a.currency}</p></TableCell>
                      <TableCell className="hidden text-end font-mono text-[13px] text-muted-foreground md:table-cell" dir="ltr">{fmtMoney(a.opening, a.currency)}</TableCell>
                      <TableCell className={cn('text-end font-mono font-semibold', bal < 0 && 'text-destructive')} dir="ltr">{fmtMoney(bal, a.currency)}</TableCell>
                      <TableCell className="hidden text-end font-mono text-[13px] sm:table-cell" dir="ltr">{fmtUSD(usd[a.code] ?? 0)}</TableCell>
                      <TableCell className="hidden text-center lg:table-cell" onClick={(e) => e.stopPropagation()}>
                        {!a.system && canManageSettings(me.role) ? <Toggle checked={a.active} onChange={(v) => updateAccount(a.code, { active: v })} /> : <span className="text-[11px] text-muted-foreground">{tr('Needed', 'أساسي')}</span>}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canManageSettings(me.role) && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ open: true, account: a })}><Pencil className="h-3.5 w-3.5" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>
        );
      })}

      <AccountDialog open={dialog.open} account={dialog.account} defaultCat={selected === 'all' ? 'funds' : selected} onClose={() => setDialog({ open: false })} />
    </div>
  );
}
