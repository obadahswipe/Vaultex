import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Toggle, attempt } from '@/components/shared/form';
import { AccountPicker } from '@/components/shared/AccountPicker';
import { useBooks } from '@/stores/books.store';
import { useLedger } from '@/lib/data/hooks';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Gateway } from '@/lib/data/types';

const KIND: Record<Gateway['kind'], { en: string; ar: string }> = {
  bank: { en: 'Bank transfer', ar: 'تحويل بنكي' }, card: { en: 'Card', ar: 'بطاقة' },
  crypto: { en: 'Crypto', ar: 'عملة رقمية' }, ewallet: { en: 'Online wallet', ar: 'محفظة إلكترونية' },
};

export default function GatewaySettings() {
  const { tr, nameOf } = useTranslation();
  const gateways = useBooks((s) => s.gateways);
  const updateGateway = useBooks((s) => s.updateGateway);
  const addGateway = useBooks((s) => s.addGateway);
  const { byCode } = useLedger();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', kind: 'bank' as Gateway['kind'], accountCode: '', fee: '0' });

  return (
    <>
      <SectionCard
        padded={false}
        title={tr('Ways clients can pay', 'طرق الدفع للزبائن')}
        description={tr('Each way of paying sends money to one of your money places. The fee is what the provider keeps.', 'كل طريقة دفع ترسل المال إلى أحد أماكن مالك. والرسوم هي ما يأخذه المزوّد.')}
        action={<Button size="sm" variant="gradient" className="gap-1" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />{tr('Add', 'أضف')}</Button>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Name', 'الاسم')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tr('Kind', 'النوع')}</TableHead>
              <TableHead className="hidden md:table-cell">{tr('Money goes to', 'يذهب المال إلى')}</TableHead>
              <TableHead className="text-end">{tr('Fee %', 'الرسوم %')}</TableHead>
              <TableHead className="text-center">{tr('On', 'مفعّل')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gateways.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="hidden text-[13px] sm:table-cell">{tr(KIND[g.kind].en, KIND[g.kind].ar)}</TableCell>
                <TableCell className="hidden text-[13px] md:table-cell">{nameOf(byCode.get(g.accountCode))}</TableCell>
                <TableCell className="text-end"><Input type="number" step="0.1" className="ms-auto h-8 w-20 text-end" value={g.feePercent} onChange={(e) => updateGateway(g.id, { feePercent: Number(e.target.value) || 0 })} /></TableCell>
                <TableCell className="text-center"><Toggle checked={g.enabled} onChange={(v) => updateGateway(g.id, { enabled: v })} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Add a way to pay', 'أضف طريقة دفع')}</DialogTitle>
            <DialogDescription>{tr('For example a new bank or a crypto network.', 'مثلًا بنك جديد أو شبكة عملة رقمية.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={tr('Kind', 'النوع')}>
              <NativeSelect value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Gateway['kind'] })}>
                {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{tr(v.en, v.ar)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Money goes to', 'يذهب المال إلى')}><AccountPicker value={f.accountCode} onChange={(v) => setF({ ...f, accountCode: v })} categories={['banks', 'funds', 'suppliers']} /></Field>
            <Field label={tr('Fee %', 'الرسوم %')}><Input type="number" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!f.name.trim() || !f.accountCode} onClick={() => { if (attempt(() => addGateway({ name: f.name.trim(), kind: f.kind, accountCode: f.accountCode, feePercent: Number(f.fee) || 0, enabled: true }), tr('Added', 'تمت الإضافة'))) { setOpen(false); setF({ name: '', kind: 'bank', accountCode: '', fee: '0' }); } }}>{tr('Add', 'أضف')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
