import { useState } from 'react';
import { Plus, MapPin, Users, Wallet, Phone, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, Toggle, attempt } from '@/components/shared/form';
import { AccountPicker } from '@/components/shared/AccountPicker';
import { useBooks } from '@/stores/books.store';
import { useLedger } from '@/lib/data/hooks';
import { fmtMoney, fmtUSD } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Branch } from '@/lib/data/types';

export default function Branches() {
  const { tr, nameOf } = useTranslation();
  const branches = useBooks((s) => s.branches);
  const employees = useBooks((s) => s.employees);
  const addBranch = useBooks((s) => s.addBranch);
  const updateBranch = useBooks((s) => s.updateBranch);
  const { accounts, balances, usd, byCode } = useLedger();
  const [dialog, setDialog] = useState<{ open: boolean; branch?: Branch }>({ open: false });
  const [f, setF] = useState({ name: '', arabic: '', city: '', manager: '', phone: '', cash: '' });

  const open = (branch?: Branch) => {
    setF(branch
      ? { name: branch.name, arabic: branch.arabic, city: branch.city, manager: branch.manager, phone: branch.phone ?? '', cash: branch.cashAccountCode ?? '' }
      : { name: '', arabic: '', city: '', manager: '', phone: '', cash: '' });
    setDialog({ open: true, branch });
  };
  const save = () => {
    const data = { name: f.name.trim(), arabic: f.arabic.trim() || f.name.trim(), city: f.city, manager: f.manager, phone: f.phone || undefined, cashAccountCode: f.cash || undefined };
    const ok = dialog.branch
      ? attempt(() => updateBranch(dialog.branch!.id, data), tr('Saved', 'تم الحفظ'))
      : attempt(() => addBranch({ ...data, active: true }), tr('Branch added', 'تمت إضافة الفرع'));
    if (ok) setDialog({ open: false });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Branches', 'الفروع')}
        subtitle={tr('Your offices, who runs them, and the cash each one holds.', 'مكاتبك، ومن يديرها، والنقد في كل منها.')}
        hint={<PageHint id="branches-v2" title={tr('Tip', 'نصيحة')}>{tr('Link each branch to its cash box. Then you can see how much cash every office has.', 'اربط كل فرع بصندوقه النقدي. عندها ترى كم لدى كل مكتب من النقد.')}</PageHint>}
        actions={<Button variant="gradient" className="gap-1.5" onClick={() => open()}><Plus className="h-4 w-4" />{tr('Add a branch', 'أضف فرعًا')}</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => {
          const staff = employees.filter((e) => e.branchId === b.id && e.active).length;
          const boxes = accounts.filter((a) => a.branchId === b.id && (a.category === 'funds' || a.category === 'banks'));
          const cashUsd = boxes.reduce((s, a) => s + (usd[a.code] ?? 0), 0);
          const main = b.cashAccountCode ? byCode.get(b.cashAccountCode) : undefined;
          return (
            <div key={b.id} className={cn('card-elevated flex flex-col p-5', !b.active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
                  <div>
                    <p className="text-[16px] font-bold">{nameOf({ name: b.name, arabic: b.arabic })}</p>
                    <p className="text-[12px] text-muted-foreground">{b.city}</p>
                  </div>
                </div>
                <Toggle checked={b.active} onChange={(v) => updateBranch(b.id, { active: v })} />
              </div>
              <div className="mt-4 space-y-2 text-[13px]">
                <p className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{tr(`Manager: ${b.manager} · ${staff} people`, `المدير: ${b.manager} · ${staff} موظفين`)}</p>
                {b.phone && <p className="flex items-center gap-2" dir="ltr"><Phone className="h-4 w-4 text-muted-foreground" />{b.phone}</p>}
                <p className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" />{tr(`Cash here: ${fmtUSD(cashUsd)}`, `النقد هنا: ${fmtUSD(cashUsd)}`)}</p>
                {main && <p className="text-[12px] text-muted-foreground">{tr('Main cash box', 'الصندوق الرئيسي')}: {nameOf(main)} — <span dir="ltr">{fmtMoney(balances[main.code] ?? 0, main.currency)}</span></p>}
              </div>
              <Button size="sm" variant="outline" className="mt-4 gap-1 self-start" onClick={() => open(b)}><Pencil className="h-3.5 w-3.5" />{tr('Edit', 'تعديل')}</Button>
            </div>
          );
        })}
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.branch ? tr('Edit branch', 'تعديل الفرع') : tr('Add a branch', 'أضف فرعًا')}</DialogTitle>
            <DialogDescription>{tr('An office where your team works.', 'مكتب يعمل فيه فريقك.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={f.arabic} onChange={(e) => setF({ ...f, arabic: e.target.value })} /></Field>
            <Field label={tr('City', 'المدينة')}><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label={tr('Manager', 'المدير')}><Input value={f.manager} onChange={(e) => setF({ ...f, manager: e.target.value })} /></Field>
            <Field label={tr('Phone', 'الهاتف')}><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label={tr('Main cash box', 'الصندوق الرئيسي')}><AccountPicker value={f.cash} onChange={(v) => setF({ ...f, cash: v })} categories={['funds']} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog({ open: false })}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!f.name.trim()} onClick={save}>{tr('Save', 'حفظ')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
