import { SectionCard } from '@/components/shared/SectionCard';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toggle } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function SymbolSettings() {
  const { tr } = useTranslation();
  const symbols = useBooks((s) => s.symbols);
  const updateSymbol = useBooks((s) => s.updateSymbol);
  return (
    <SectionCard padded={false} title={tr('What clients can trade', 'ما يمكن للزبائن تداوله')} description={tr('Turn a symbol off to stop new trades on it. "Max lots" is the biggest single trade allowed.', 'أوقف الرمز لمنع صفقات جديدة عليه. "الحد الأقصى" هو أكبر صفقة واحدة مسموحة.')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tr('Symbol', 'الرمز')}</TableHead>
            <TableHead className="hidden sm:table-cell">{tr('What it is', 'ما هو')}</TableHead>
            <TableHead className="text-end">{tr('Spread', 'فرق السعر')}</TableHead>
            <TableHead className="text-end">{tr('Max lots', 'الحد الأقصى')}</TableHead>
            <TableHead className="text-center">{tr('On', 'مفعّل')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {symbols.map((s) => (
            <TableRow key={s.symbol}>
              <TableCell className="font-mono font-semibold">{s.symbol}</TableCell>
              <TableCell className="hidden text-[13px] sm:table-cell">{s.description}</TableCell>
              <TableCell className="text-end"><Input type="number" className="ms-auto h-8 w-20 text-end" value={s.spread} onChange={(e) => updateSymbol(s.symbol, { spread: Number(e.target.value) || 0 })} /></TableCell>
              <TableCell className="text-end"><Input type="number" className="ms-auto h-8 w-20 text-end" value={s.maxLots} onChange={(e) => updateSymbol(s.symbol, { maxLots: Number(e.target.value) || 0 })} /></TableCell>
              <TableCell className="text-center"><Toggle checked={s.enabled} onChange={(v) => updateSymbol(s.symbol, { enabled: v })} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );
}
