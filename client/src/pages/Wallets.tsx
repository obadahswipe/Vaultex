import { useState } from 'react';
import { Plus, CreditCard, Bitcoin, Smartphone, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Toggle, attempt } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { CURRENCIES, type Currency, type Wallet } from '@/lib/data/types';

const KIND: Record<Wallet['kind'], { en: string; ar: string; icon: typeof CreditCard }> = {
  card:    { en: 'Bank card',       ar: 'بطاقة بنكية',  icon: CreditCard },
  crypto:  { en: 'Crypto wallet',   ar: 'محفظة رقمية',  icon: Bitcoin },
  ewallet: { en: 'Online wallet',   ar: 'محفظة إلكترونية', icon: Smartphone },
};

export default function Wallets() {
  const { tr, nameOf } = useTranslation();
  const wallets = useBooks((s) => s.wallets);
  const clients = useBooks((s) => s.clients);
  const addWallet = useBooks((s) => s.addWallet);
  const updateWallet = useBooks((s) => s.updateWallet);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ clientId: '', kind: 'crypto' as Wallet['kind'], provider: '', currency: 'USDT' as Currency, address: '' });

  const save = () => {
    const ok = attempt(() => addWallet({ ...f, address: f.address || undefined, verified: false }), tr('Wallet added', 'تمت إضافة المحفظة'));
    if (ok) { setOpen(false); setF({ clientId: '', kind: 'crypto', provider: '', currency: 'USDT', address: '' }); }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Client wallets', 'محافظ الزبائن')}
        subtitle={tr('Cards and wallets your clients use to send and get money.', 'البطاقات والمحافظ التي يستخدمها زبائنك لإرسال المال واستلامه.')}
        hint={
          <PageHint id="wallets-v2" title={tr('Why check wallets?', 'لماذا نتحقق من المحافظ؟')}>
            {tr('Only send money to a wallet you have checked. It must belong to the same person as the trading account.', 'لا ترسل المال إلا إلى محفظة تحققت منها. يجب أن تكون لنفس صاحب حساب التداول.')}
          </PageHint>
        }
        actions={<Button variant="gradient" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{tr('Add a wallet', 'أضف محفظة')}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={tr('Wallets', 'المحافظ')} value={wallets.length} icon={CreditCard} accent="blue" deltaLabel={tr(`For ${new Set(wallets.map((w) => w.clientId)).size} clients`, `لـ ${new Set(wallets.map((w) => w.clientId)).size} زبائن`)} />
        <StatCard label={tr('Checked', 'تم التحقق')} value={wallets.filter((w) => w.verified).length} icon={ShieldCheck} accent="green" deltaLabel={tr('Safe to send money to', 'آمنة لإرسال المال')} />
        <StatCard label={tr('Need checking', 'تحتاج تحقق')} value={wallets.filter((w) => !w.verified).length} icon={ShieldCheck} accent="amber" deltaLabel={tr('Check before you pay', 'تحقق قبل الدفع')} />
      </div>

      <SectionCard padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Client', 'الزبون')}</TableHead>
              <TableHead>{tr('Kind', 'النوع')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tr('Provider', 'المزوّد')}</TableHead>
              <TableHead>{tr('Currency', 'العملة')}</TableHead>
              <TableHead className="hidden md:table-cell">{tr('Address', 'العنوان')}</TableHead>
              <TableHead className="text-end">{tr('Checked', 'تم التحقق')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wallets.map((w) => {
              const k = KIND[w.kind];
              return (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{nameOf(clients.find((c) => c.id === w.clientId))}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1.5 text-[13px]"><k.icon className="h-4 w-4 text-muted-foreground" />{tr(k.en, k.ar)}</span></TableCell>
                  <TableCell className="hidden sm:table-cell">{w.provider}</TableCell>
                  <TableCell><Badge variant="outline">{w.currency}</Badge></TableCell>
                  <TableCell className="hidden font-mono text-[12px] md:table-cell" dir="ltr">{w.address ?? '—'}</TableCell>
                  <TableCell className="text-end"><Toggle checked={w.verified} onChange={(v) => updateWallet(w.id, { verified: v })} label={tr('Checked', 'تم التحقق')} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Add a wallet', 'أضف محفظة')}</DialogTitle>
            <DialogDescription>{tr('Write it exactly as the client gave it to you.', 'اكتبها تمامًا كما أعطاك إياها الزبون.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Client', 'الزبون')} className="sm:col-span-2">
              <NativeSelect value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>
                <option value="">{tr('Choose…', 'اختر…')}</option>
                {clients.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{nameOf(c)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Kind', 'النوع')}>
              <NativeSelect value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Wallet['kind'] })}>
                {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{tr(v.en, v.ar)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Currency', 'العملة')}>
              <NativeSelect value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as Currency })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Provider', 'المزوّد')}><Input value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} placeholder="TRC20, Visa, Skrill…" /></Field>
            <Field label={tr('Address or card end', 'العنوان أو آخر أرقام البطاقة')}><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!f.clientId || !f.provider} onClick={save}>{tr('Add', 'أضف')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
