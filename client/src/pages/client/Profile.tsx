import { ShieldCheck, ShieldAlert, Mail, Phone, Globe, Network, CreditCard } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useMe } from './useMe';

export default function ClientProfile() {
  const { tr, nameOf } = useTranslation();
  const me = useMe();
  const ibs = useBooks((s) => s.ibs);
  const wallets = useBooks((s) => s.wallets);
  if (!me.client) return null;
  const c = me.client;
  const ib = ibs.find((i) => i.id === c.ibParentId);
  const mine = wallets.filter((w) => w.clientId === c.id);

  return (
    <div className="space-y-6">
      <h1 className="text-[1.75rem] font-bold tracking-tight">{tr('Me', 'حسابي')}</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={nameOf(c)} description={tr(`Client since ${c.joinDate}`, `زبون منذ ${c.joinDate}`)}>
          <div className="space-y-3 text-[14px]">
            {c.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{c.email}</p>}
            {c.phone && <p className="flex items-center gap-2" dir="ltr"><Phone className="h-4 w-4 text-muted-foreground" />{c.phone}</p>}
            {c.country && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />{c.country}</p>}
            {ib && <p className="flex items-center gap-2"><Network className="h-4 w-4 text-muted-foreground" />{tr('My partner', 'شريكي')}: {nameOf(ib)}</p>}
          </div>
        </SectionCard>
        <SectionCard title={tr('My ID papers', 'وثائق هويتي')}>
          {c.kycStatus === 'approved' ? (
            <p className="flex items-start gap-2 text-[14px]"><ShieldCheck className="mt-0.5 h-5 w-5 text-success" />{tr('Your ID is checked. You can add and take out money.', 'تم التحقق من هويتك. يمكنك إضافة المال وسحبه.')}</p>
          ) : (
            <p className="flex items-start gap-2 text-[14px]"><ShieldAlert className="mt-0.5 h-5 w-5 text-warning" />{c.kycStatus === 'pending' ? tr('We got your papers and are checking them.', 'استلمنا أوراقك ونقوم بمراجعتها.') : tr('Please send a photo of your ID and a bill with your address.', 'من فضلك أرسل صورة هويتك وفاتورة عليها عنوانك.')}</p>
          )}
        </SectionCard>
        <SectionCard title={tr('My cards and wallets', 'بطاقاتي ومحافظي')} className="lg:col-span-2" padded={false}>
          <ul className="divide-y divide-border/40">
            {mine.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-6 py-3 text-[14px]">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{w.provider} · {w.currency} {w.address && <span className="font-mono text-[12px] text-muted-foreground" dir="ltr">{w.address}</span>}</span>
                {w.verified ? <Badge variant="success">{tr('Checked', 'تم التحقق')}</Badge> : <Badge variant="warning">{tr('Being checked', 'قيد التحقق')}</Badge>}
              </li>
            ))}
            {mine.length === 0 && <li className="px-6 py-8 text-center text-[13px] text-muted-foreground">{tr('No cards or wallets yet. Ask our team to add one.', 'لا بطاقات أو محافظ بعد. اطلب من فريقنا إضافتها.')}</li>}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
