import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Crown, PiggyBank, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, attempt } from '@/components/shared/form';
import { AccountPicker } from '@/components/shared/AccountPicker';
import { useBooks } from '@/stores/books.store';
import { useActingUser, useLedger } from '@/lib/data/hooks';
import { fmtUSD } from '@/lib/data/money';
import { isAdmin } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];

export default function Ownership() {
  const { tr, nameOf } = useTranslation();
  const me = useActingUser();
  const owners = useBooks((s) => s.owners);
  const addCapital = useBooks((s) => s.addCapital);
  const addOwner = useBooks((s) => s.addOwner);
  const { balances, sheet } = useLedger();
  const [capOpen, setCapOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [cap, setCap] = useState({ ownerId: owners[0]?.id ?? '', amount: '', to: '1201' });
  const [o, setO] = useState({ name: '', arabic: '', share: '' });

  const totalShares = owners.reduce((s, x) => s + x.sharePercent, 0);
  const companyValue = sheet.owners + sheet.profit + sheet.currencyEffect;
  const pie = owners.map((x) => ({ name: nameOf(x), value: x.sharePercent }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Owners', 'المالكون')}
        subtitle={tr('Who owns the company, and the money they put in.', 'من يملك الشركة، والمال الذي وضعوه فيها.')}
        hint={<PageHint id="owners-v2" title={tr("The owners' share", 'حصة المالكين')}>{tr("The owners' share is what is left after you pay everyone you owe. Each owner gets their part of it.", 'حصة المالكين هي ما يبقى بعد أن تدفع لكل من تدين لهم. وكل مالك يأخذ جزءه منها.')}</PageHint>}
        actions={isAdmin(me.role) && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setOwnerOpen(true)}><Plus className="h-4 w-4" />{tr('Add an owner', 'أضف مالكًا')}</Button>
            <Button variant="gradient" className="gap-1.5" onClick={() => setCapOpen(true)}><PiggyBank className="h-4 w-4" />{tr('Owner puts in money', 'المالك يضع مالًا')}</Button>
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={tr("Owners' share today", 'حصة المالكين اليوم')} value={fmtUSD(companyValue)} icon={Crown} accent="violet" deltaLabel={tr('What you own minus what you owe', 'ما تملكه ناقص ما عليك')} />
        <StatCard label={tr('Money owners put in', 'المال الذي وضعه المالكون')} value={fmtUSD(owners.reduce((s, x) => s + (balances[x.capitalAccountCode] ?? 0), 0))} icon={PiggyBank} accent="blue" deltaLabel={tr(`${owners.length} owners`, `${owners.length} مالكين`)} />
        <StatCard label={tr('Profit not shared yet', 'أرباح لم تُوزّع')} value={fmtUSD(sheet.profit)} icon={TrendingUp} accent={sheet.profit >= 0 ? 'green' : 'pink'} deltaLabel={tr('Since the books started', 'منذ بدء الدفاتر')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title={tr('Who owns what', 'من يملك ماذا')}>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {totalShares !== 100 && <p className="mt-2 text-[12px] text-warning">{tr(`Shares add up to ${totalShares}%, not 100%.`, `مجموع الحصص ${totalShares}% وليس 100%.`)}</p>}
        </SectionCard>
        <SectionCard className="lg:col-span-2" padded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('Owner', 'المالك')}</TableHead>
                <TableHead className="text-end">{tr('Share', 'الحصة')}</TableHead>
                <TableHead className="text-end">{tr('Money put in', 'المال المدفوع')}</TableHead>
                <TableHead className="text-end">{tr('Worth today', 'القيمة اليوم')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((x, i) => (
                <TableRow key={x.id}>
                  <TableCell className="font-medium"><span className="me-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{nameOf(x)}</TableCell>
                  <TableCell className="text-end">{x.sharePercent}%</TableCell>
                  <TableCell className="text-end font-mono">{fmtUSD(balances[x.capitalAccountCode] ?? 0)}</TableCell>
                  <TableCell className="text-end font-mono font-semibold">{fmtUSD((companyValue * x.sharePercent) / 100)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>

      <Dialog open={capOpen} onOpenChange={setCapOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Owner puts in money', 'المالك يضع مالًا')}</DialogTitle>
            <DialogDescription>{tr('The money goes into a bank or cash box, and the owner’s money in the company goes up.', 'يدخل المال إلى بنك أو صندوق، ويزيد مال المالك في الشركة.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label={tr('Which owner', 'أي مالك')}>
              <NativeSelect value={cap.ownerId} onChange={(e) => setCap({ ...cap, ownerId: e.target.value })}>
                {owners.map((x) => <option key={x.id} value={x.id}>{nameOf(x)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('How much (USD)', 'كم (دولار)')}><Input type="number" value={cap.amount} onChange={(e) => setCap({ ...cap, amount: e.target.value })} /></Field>
            <Field label={tr('Into', 'إلى')}><AccountPicker value={cap.to} onChange={(v) => setCap({ ...cap, to: v })} categories={['banks', 'funds']} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCapOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!(Number(cap.amount) > 0) || !cap.to} onClick={() => { if (attempt(() => addCapital(cap.ownerId, Number(cap.amount), cap.to, me.email), tr('Written in the books', 'سُجّل في الدفاتر'))) setCapOpen(false); }}>{tr('Save', 'حفظ')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ownerOpen} onOpenChange={setOwnerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Add an owner', 'أضف مالكًا')}</DialogTitle>
            <DialogDescription>{tr('Remember to change the other owners’ shares so they add up to 100%.', 'تذكّر تعديل حصص المالكين الآخرين ليصبح المجموع 100%.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Name', 'الاسم')}><Input value={o.name} onChange={(e) => setO({ ...o, name: e.target.value })} /></Field>
            <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={o.arabic} onChange={(e) => setO({ ...o, arabic: e.target.value })} /></Field>
            <Field label={tr('Share (%)', 'الحصة (%)')}><Input type="number" value={o.share} onChange={(e) => setO({ ...o, share: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOwnerOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!o.name.trim()} onClick={() => { if (attempt(() => addOwner({ name: o.name.trim(), arabic: o.arabic || undefined, sharePercent: Number(o.share) || 0, joined: new Date().toISOString().slice(0, 10) }), tr('Owner added', 'تمت إضافة المالك'))) { setOwnerOpen(false); setO({ name: '', arabic: '', share: '' }); } }}>{tr('Add', 'أضف')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
