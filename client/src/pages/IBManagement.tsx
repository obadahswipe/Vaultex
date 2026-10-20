import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Network, Users, HandCoins, Pencil, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, TextArea, Toggle, attempt } from '@/components/shared/form';
import { NewRequestDialog } from '@/components/operations/NewRequestDialog';
import { useBooks } from '@/stores/books.store';
import { usePartnerStats } from '@/lib/data/partners';
import { fmtUSD } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { IBRecord } from '@/lib/data/types';

const LABELS: Record<string, { en: string; ar: string; tone: 'success' | 'warning' | 'destructive' }> = {
  trusted:         { en: 'Trusted',          ar: 'موثوق',        tone: 'success' },
  hard_debt:       { en: 'Slow to pay back', ar: 'بطيء السداد',  tone: 'warning' },
  impossible_debt: { en: 'Will not pay back', ar: 'لن يسدد',     tone: 'destructive' },
};

function PartnerDialog({ partner, open, onClose }: { partner?: IBRecord; open: boolean; onClose: () => void }) {
  const { tr, nameOf } = useTranslation();
  const addIB = useBooks((s) => s.addIB);
  const updateIB = useBooks((s) => s.updateIB);
  const ibs = useBooks((s) => s.ibs);
  const [f, setF] = useState({ name: '', arabic: '', email: '', mt5: '', rate: '5', parent: '', label: 'trusted', notes: '', active: true });
  useEffect(() => {
    if (!open) return;
    setF(partner
      ? { name: partner.name, arabic: partner.arabic ?? '', email: partner.email ?? '', mt5: partner.mt5AccountNo, rate: String(partner.commissionRate), parent: partner.parentIBId ?? '', label: partner.classification, notes: partner.notes ?? '', active: partner.active }
      : { name: '', arabic: '', email: '', mt5: String(700100 + ibs.length + 1), rate: '5', parent: '', label: 'trusted', notes: '', active: true });
  }, [open, partner, ibs.length]);
  const save = () => {
    const data = {
      name: f.name.trim(), arabic: f.arabic.trim() || undefined, email: f.email || undefined, mt5AccountNo: f.mt5,
      commissionRate: Number(f.rate) || 0, parentIBId: f.parent || undefined, classification: f.label, notes: f.notes || undefined, active: f.active,
    };
    const ok = partner
      ? attempt(() => updateIB(partner.id, data), tr('Saved', 'تم الحفظ'))
      : attempt(() => addIB({ ...data, linkedClientIds: [], subIBIds: [] }), tr(`${data.name} was added`, `تمت إضافة ${data.arabic ?? data.name}`));
    if (ok) onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{partner ? tr('Edit partner', 'تعديل الشريك') : tr('Add a partner', 'أضف شريكًا')}</DialogTitle>
          <DialogDescription>{tr('A partner (IB) brings you clients. You pay them for every lot their clients trade.', 'الشريك (الوكيل) يحضر لك الزبائن. وتدفع له عن كل لوت يتداوله زبائنه.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={f.arabic} onChange={(e) => setF({ ...f, arabic: e.target.value })} /></Field>
          <Field label={tr('Email', 'البريد الإلكتروني')}><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label={tr('MT5 account number', 'رقم حساب MT5')}><Input value={f.mt5} onChange={(e) => setF({ ...f, mt5: e.target.value })} /></Field>
          <Field label={tr('Pay for every 1 lot (USD)', 'الأجر عن كل لوت (دولار)')} help={tr('Most partners get $3 to $10.', 'معظم الشركاء يحصلون على 3 إلى 10 دولارات.')}>
            <Input type="number" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
          </Field>
          <Field label={tr('Works under another partner', 'يعمل تحت شريك آخر')}>
            <NativeSelect value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })}>
              <option value="">{tr('No', 'لا')}</option>
              {ibs.filter((i) => i.id !== partner?.id).map((i) => <option key={i.id} value={i.id}>{nameOf(i)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Label', 'التصنيف')}>
            <NativeSelect value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })}>
              {Object.entries(LABELS).map(([k, v]) => <option key={k} value={k}>{tr(v.en, v.ar)}</option>)}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-[13px]">
            <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} /> {f.active ? tr('Active', 'نشط') : tr('Turned off', 'متوقف')}
          </label>
        </div>
        <Field label={tr('Notes', 'ملاحظات')}><TextArea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{tr('Cancel', 'إلغاء')}</Button>
          <Button variant="gradient" disabled={!f.name.trim()} onClick={save}>{tr('Save', 'حفظ')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function IBManagement() {
  const { tr, nameOf } = useTranslation();
  const ibs = useBooks((s) => s.ibs);
  const clients = useBooks((s) => s.clients);
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<{ open: boolean; partner?: IBRecord }>({ open: params.get('new') === '1' });
  const [payFor, setPayFor] = useState<string | null>(null);

  useEffect(() => { if (params.get('new') === '1') setDialog({ open: true }); }, [params]);

  const today = new Date().toISOString().slice(0, 10);
  const stats = usePartnerStats(today.slice(0, 8) + '01', today);
  const totalOwed = stats.reduce((s, r) => s + r.owed, 0);
  const totalEarned = stats.reduce((s, r) => s + r.earned, 0);
  const brought = clients.filter((c) => c.ibParentId).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Partners (IBs)', 'الشركاء (الوكلاء)')}
        subtitle={tr('People and companies that bring you new clients.', 'أشخاص وشركات يحضرون لك زبائن جددًا.')}
        hint={
          <PageHint id="ib-v2" title={tr('How partners get paid', 'كيف يحصل الشركاء على أجرهم')}>
            {tr('Each partner earns a fixed amount for every lot their clients trade. Vaultex adds it up when you close the day. Press "Pay" to send them their money.', 'كل شريك يربح مبلغًا ثابتًا عن كل لوت يتداوله زبائنه. فولتكس يجمعه عند إغلاق اليوم. اضغط "ادفع" لترسل له ماله.')}
          </PageHint>
        }
        actions={<Button variant="gradient" className="gap-1.5" onClick={() => setDialog({ open: true })}><Plus className="h-4 w-4" />{tr('Add a partner', 'أضف شريكًا')}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Active partners', 'الشركاء النشطون')} value={ibs.filter((i) => i.active).length} icon={Network} accent="blue" deltaLabel={tr(`${ibs.length} in total`, `${ibs.length} بالمجموع`)} />
        <StatCard label={tr('Clients they brought', 'زبائن أحضروهم')} value={brought} icon={Users} accent="violet" deltaLabel={tr(`of ${clients.length} clients`, `من ${clients.length} زبونًا`)} />
        <StatCard label={tr('Earned this month', 'ربحوه هذا الشهر')} value={fmtUSD(totalEarned)} icon={HandCoins} accent="green" deltaLabel={tr('Partner pay booked', 'أجور الشركاء المسجلة')} />
        <StatCard label={tr('You owe them now', 'تدين لهم الآن')} value={fmtUSD(totalOwed)} icon={Wallet} accent="amber" deltaLabel={tr('Not paid yet', 'لم يُدفع بعد')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ ib, clients: n, lots, earned, owed }) => {
          const label = LABELS[ib.classification] ?? { en: ib.classification, ar: ib.classification, tone: 'success' as const };
          const parent = ibs.find((p) => p.id === ib.parentIBId);
          return (
            <div key={ib.id} className={cn('card-elevated flex flex-col p-5', !ib.active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[16px] font-bold">{nameOf(ib)}</p>
                  <p className="text-[12px] text-muted-foreground">MT5 {ib.mt5AccountNo}{parent ? ` · ${tr('under', 'تحت')} ${nameOf(parent)}` : ''}</p>
                </div>
                <Badge variant={label.tone}>{tr(label.en, label.ar)}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div><p className="text-[11px] text-muted-foreground">{tr('Clients', 'الزبائن')}</p><p className="font-semibold">{n}</p></div>
                <div><p className="text-[11px] text-muted-foreground">{tr('Pay per lot', 'الأجر لكل لوت')}</p><p className="font-semibold">{fmtUSD(ib.commissionRate, 2)}</p></div>
                <div><p className="text-[11px] text-muted-foreground">{tr('Lots this month', 'لوتات هذا الشهر')}</p><p className="font-semibold">{lots}</p></div>
                <div><p className="text-[11px] text-muted-foreground">{tr('Earned this month', 'ربح هذا الشهر')}</p><p className="font-semibold text-success">{fmtUSD(earned, 2)}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                <span className="text-[12px] text-muted-foreground">{tr('You owe them', 'تدين له')}</span>
                <span className="font-mono text-[15px] font-bold">{fmtUSD(owed, 2)}</span>
              </div>
              {ib.notes && <p className="mt-3 text-[12px] italic text-muted-foreground">“{ib.notes}”</p>}
              <div className="mt-auto flex gap-2 pt-4">
                <Button size="sm" variant="gradient" className="flex-1" disabled={owed <= 0} onClick={() => setPayFor(ib.treeAccountCode)}>
                  {tr('Pay', 'ادفع')}
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setDialog({ open: true, partner: ib })}>
                  <Pencil className="h-3.5 w-3.5" />{tr('Edit', 'تعديل')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <PartnerDialog open={dialog.open} partner={dialog.partner} onClose={() => { setDialog({ open: false }); const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }); }} />
      <NewRequestDialog open={!!payFor} presetAccount={payFor ?? undefined} presetType="ib_withdrawal" onClose={() => setPayFor(null)} />
    </div>
  );
}
