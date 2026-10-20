import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, attempt } from '@/components/shared/form';
import { PostingError } from '@/lib/data/ledger';
import { useBooks } from '@/stores/books.store';
import { fmtMoney } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useMe } from '@/pages/client/useMe';

/** A client asks to add or take out money. The request goes to the team's "Money requests" page. */
export function MoneyRequestDialog({ kind, onClose }: { kind: 'deposit' | 'withdrawal' | null; onClose: () => void }) {
  const { tr } = useTranslation();
  const me = useMe();
  const allGateways = useBooks((s) => s.gateways);
  const gateways = useMemo(() => allGateways.filter((g) => g.enabled), [allGateways]);
  const addRequest = useBooks((s) => s.addRequest);
  const [amount, setAmount] = useState('');
  const [via, setVia] = useState(gateways[0]?.id ?? '');
  const [note, setNote] = useState('');
  if (!kind || !me.client || !me.account) return null;
  const amt = Number(amount);
  const gw = gateways.find((g) => g.id === via);
  const tooMuch = kind === 'withdrawal' && amt > me.balance;

  const send = () => {
    const ok = attempt(() => {
      if (!gw) throw new PostingError('Pick a way to pay.', 'اختر طريقة الدفع.');
      if (tooMuch) throw new PostingError('You do not have that much money.', 'ليس لديك هذا المبلغ.');
      addRequest({
        type: kind, date: new Date().toISOString().slice(0, 10), priority: 'normal', source: 'client_portal',
        createdBy: 'client portal', note: note || `${gw.name}`,
        lines: [{ id: `ln-${Date.now()}`, accountNo: me.account!.code, accountName: me.client!.name, amount: amt, currency: me.currency, counterAccountCode: gw.accountCode }],
      });
    }, tr('Request sent. We will tell you when it is done.', 'أُرسل الطلب. سنخبرك عندما يكتمل.'));
    if (ok) { setAmount(''); setNote(''); onClose(); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === 'deposit' ? tr('Add money', 'أضف مالًا') : tr('Take out money', 'اسحب مالًا')}</DialogTitle>
          <DialogDescription>
            {kind === 'deposit'
              ? tr('Tell us how much you will send. Our team checks it and adds it to your account.', 'أخبرنا كم سترسل. فريقنا يتحقق منه ويضيفه إلى حسابك.')
              : tr(`You have ${fmtMoney(me.balance, me.currency)}. Our team checks your request and sends the money.`, `لديك ${fmtMoney(me.balance, me.currency)}. فريقنا يراجع طلبك ويرسل المال.`)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={tr(`How much (${me.currency})?`, `كم (${me.currency})؟`)}>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </Field>
          {tooMuch && <p className="text-[13px] text-destructive">{tr('That is more than you have.', 'هذا أكثر مما لديك.')}</p>}
          <Field label={kind === 'deposit' ? tr('How will you pay?', 'كيف ستدفع؟') : tr('How do you want to get it?', 'كيف تريد استلامه؟')}>
            <NativeSelect value={via} onChange={(e) => setVia(e.target.value)}>
              {gateways.map((g) => <option key={g.id} value={g.id}>{g.name}{g.feePercent ? ` (${g.feePercent}% ${tr('fee', 'رسوم')})` : ''}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Note (optional)', 'ملاحظة (اختياري)')}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{tr('Cancel', 'إلغاء')}</Button>
          <Button variant="gradient" disabled={!(amt > 0) || tooMuch} onClick={send}>{tr('Send request', 'أرسل الطلب')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
