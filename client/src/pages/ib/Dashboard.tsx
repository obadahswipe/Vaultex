import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { HandCoins, Wallet, Users, BarChart3, Link2, Copy, Check } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, attempt } from '@/components/shared/form';
import { PostingError } from '@/lib/data/ledger';
import { useBooks } from '@/stores/books.store';
import { fmtUSD } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useMyIB } from './useMyIB';

export default function IBDashboard() {
  const { tr, nameOf } = useTranslation();
  const me = useMyIB();
  const allGateways = useBooks((s) => s.gateways);
  const gateways = useMemo(() => allGateways.filter((g) => g.enabled), [allGateways]);
  const addRequest = useBooks((s) => s.addRequest);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [via, setVia] = useState(gateways[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  if (!me) return null;
  const canGet = Math.max(0, me.owed - me.waitingPay);
  const link = `https://vaultex.app/join?partner=${me.ib.mt5AccountNo}`;

  const ask = () => {
    const amt = Number(amount);
    const gw = gateways.find((g) => g.id === via);
    const ok = attempt(() => {
      if (!gw) throw new PostingError('Pick how you want to get paid.', 'اختر كيف تريد استلام أجرك.');
      if (amt > canGet) throw new PostingError('That is more than you can get right now.', 'هذا أكثر مما يمكنك استلامه الآن.');
      addRequest({
        type: 'ib_withdrawal', date: new Date().toISOString().slice(0, 10), priority: 'normal', source: 'ib_portal', createdBy: 'ib portal', note: gw.name,
        lines: [{ id: `ln-${Date.now()}`, accountNo: me.ib.treeAccountCode, accountName: `Partner: ${me.ib.name}`, amount: amt, currency: 'USD', counterAccountCode: gw.accountCode }],
      });
    }, tr('Request sent. We will pay you soon.', 'أُرسل الطلب. سندفع لك قريبًا.'));
    if (ok) { setOpen(false); setAmount(''); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight">{tr(`Hello, ${me.ib.name}`, `مرحبًا يا ${nameOf(me.ib)}`)}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{tr(`You earn ${fmtUSD(me.ib.commissionRate, 2)} for every lot your clients trade.`, `تربح ${fmtUSD(me.ib.commissionRate, 2)} عن كل لوت يتداوله زبائنك.`)}</p>
        </div>
        <Button variant="gradient" className="gap-1.5" disabled={canGet <= 0} onClick={() => setOpen(true)}><Wallet className="h-4 w-4" />{tr('Ask to get paid', 'اطلب أجرك')}</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Earned this month', 'ربحت هذا الشهر')} value={fmtUSD(me.earnedMonth, 2)} icon={HandCoins} accent="green" deltaLabel={tr('Added every day', 'يُضاف كل يوم')} />
        <StatCard label={tr('You can get now', 'يمكنك استلامه الآن')} value={fmtUSD(canGet, 2)} icon={Wallet} accent="amber" deltaLabel={me.waitingPay ? tr(`${fmtUSD(me.waitingPay)} is on the way`, `${fmtUSD(me.waitingPay)} في الطريق`) : tr('Ready to pay out', 'جاهز للدفع')} />
        <StatCard label={tr('My clients', 'زبائني')} value={me.clients.length} icon={Users} accent="violet" deltaLabel={tr('People you brought', 'أشخاص أحضرتهم')} />
        <StatCard label={tr('Lots this month', 'لوتات هذا الشهر')} value={me.lotsMonth} icon={BarChart3} accent="blue" deltaLabel={tr('Traded by your clients', 'تداولها زبائنك')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title={tr('My pay — last 14 days', 'أجري — آخر 14 يومًا')}>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={me.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => fmtUSD(Number(v), 2)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="pay" name={tr('Pay', 'الأجر')} fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title={tr('Bring more clients', 'أحضر زبائن أكثر')}>
          <p className="text-[13px] text-muted-foreground">{tr('Share this link. Anyone who joins with it becomes your client.', 'شارك هذا الرابط. كل من ينضم من خلاله يصبح زبونك.')}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-2">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px]" dir="ltr">{link}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </SectionCard>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Ask to get paid', 'اطلب أجرك')}</DialogTitle>
            <DialogDescription>{tr(`You can get up to ${fmtUSD(canGet, 2)}.`, `يمكنك استلام حتى ${fmtUSD(canGet, 2)}.`)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label={tr('How much (USD)?', 'كم (دولار)؟')}><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(Math.floor(canGet))} /></Field>
            <Field label={tr('How do you want to get it?', 'كيف تريد استلامه؟')}>
              <NativeSelect value={via} onChange={(e) => setVia(e.target.value)}>
                {gateways.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!(Number(amount) > 0)} onClick={ask}>{tr('Send request', 'أرسل الطلب')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
