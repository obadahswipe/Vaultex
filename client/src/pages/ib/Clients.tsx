import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtUSD } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useMyIB } from './useMyIB';

export default function IBClients() {
  const { tr, nameOf } = useTranslation();
  const me = useMyIB();
  if (!me) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight">{tr('My clients', 'زبائني')}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">{tr('People you brought, and what you earned from them this month.', 'الأشخاص الذين أحضرتهم، وما ربحته منهم هذا الشهر.')}</p>
      </div>
      <SectionCard padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Client', 'الزبون')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tr('Joined', 'انضم')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tr('ID checked', 'الهوية')}</TableHead>
              <TableHead className="text-end">{tr('Lots this month', 'لوتات هذا الشهر')}</TableHead>
              <TableHead className="text-end">{tr('You earned', 'ربحت')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {me.perClient.map(({ c, lots, earned }) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{nameOf(c)}<p className="text-[11px] text-muted-foreground">{c.country}</p></TableCell>
                <TableCell className="hidden text-[13px] sm:table-cell">{c.joinDate}</TableCell>
                <TableCell className="hidden sm:table-cell">{c.kycStatus === 'approved' ? <Badge variant="success">{tr('Yes', 'نعم')}</Badge> : <Badge variant="warning">{tr('Not yet', 'ليس بعد')}</Badge>}</TableCell>
                <TableCell className="text-end">{lots}</TableCell>
                <TableCell className="text-end font-mono font-semibold text-success">{fmtUSD(earned, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {me.perClient.length === 0 && <p className="px-6 py-10 text-center text-[13px] text-muted-foreground">{tr('No clients yet. Share your link to bring some!', 'لا زبائن بعد. شارك رابطك لتحضر بعضهم!')}</p>}
      </SectionCard>
    </div>
  );
}
