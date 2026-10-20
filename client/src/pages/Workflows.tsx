import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** A list of every important action, so you always know who did what. */
export default function Workflows() {
  const { tr, lang } = useTranslation();
  const audit = useBooks((s) => s.audit);
  const users = useBooks((s) => s.users);
  const [who, setWho] = useState('');
  const [search, setSearch] = useState('');
  const name = (email: string) => users.find((u) => u.email === email)?.name ?? (email === 'system' ? tr('Vaultex (automatic)', 'فولتكس (تلقائي)') : email);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audit.filter((a) => (!who || a.by === who) && (!q || a.action.toLowerCase().includes(q) || a.actionAr.includes(q)));
  }, [audit, who, search]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof list>();
    for (const a of list) {
      const d = a.at.slice(0, 10);
      m.set(d, [...(m.get(d) ?? []), a]);
    }
    return [...m.entries()];
  }, [list]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Who did what', 'من فعل ماذا')}
        subtitle={tr('Every important action in Vaultex, with the person and the time.', 'كل إجراء مهم في فولتكس، مع الشخص والوقت.')}
        hint={<PageHint id="audit-v2" title={tr('Why keep this list?', 'لماذا نحتفظ بهذه القائمة؟')}>{tr('If something looks wrong, this list tells you who did it and when. Nobody can delete it.', 'إذا بدا شيء غير صحيح، تخبرك هذه القائمة من فعله ومتى. ولا يستطيع أحد حذفها.')}</PageHint>}
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search actions…', 'ابحث في الإجراءات…')} className="ps-9" />
        </div>
        <NativeSelect value={who} onChange={(e) => setWho(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">{tr('Everyone', 'الجميع')}</option>
          {users.map((u) => <option key={u.id} value={u.email}>{u.name}</option>)}
        </NativeSelect>
      </div>

      {groups.map(([day, items]) => (
        <SectionCard key={day} title={new Date(day).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} padded={false}>
          <ul className="divide-y divide-border/40">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-6 py-3">
                <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px]">{tr(a.action, a.actionAr)}</p>
                  <p className="text-[12px] text-muted-foreground">{name(a.by)} · {new Date(a.at).toLocaleTimeString(lang === 'ar' ? 'ar' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
      {groups.length === 0 && <p className="py-12 text-center text-[13px] text-muted-foreground">{tr('Nothing yet. Actions will show here as people work.', 'لا شيء بعد. ستظهر الإجراءات هنا أثناء العمل.')}</p>}
    </div>
  );
}
