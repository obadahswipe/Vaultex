import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Database, Users, GitBranch, Inbox, FileText, X, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUniversalSearch, type SearchResultType } from '@/hooks/useUniversalSearch';
import { useTranslation } from '@/lib/i18n/useTranslation';

const TYPE_ICONS: Record<SearchResultType, typeof Search> = {
  page: LayoutGrid,
  account: Database,
  client: Users,
  ib: GitBranch,
  request: Inbox,
  voucher: FileText,
};

const TYPE_COLORS: Record<SearchResultType, string> = {
  page: 'text-primary',
  account: 'text-sky-500',
  client: 'text-emerald-500',
  ib: 'text-violet-500',
  request: 'text-amber-500',
  voucher: 'text-indigo-500',
};

interface UniversalSearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function UniversalSearchPalette({ open, onClose }: UniversalSearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { tr } = useTranslation();
  const results = useUniversalSearch(query);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [results.length]);

  const handleSelect = (href: string) => {
    navigate(href);
    onClose();
    setQuery('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) handleSelect(results[selected].href);
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={tr('Find a client, account or page…', 'ابحث عن زبون أو حساب أو صفحة…')}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden items-center rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && query.length >= 2 && (
            <div className="py-8 text-center text-sm text-muted-foreground">{tr('Nothing found. Try another word.', 'لم نجد شيئًا. جرّب كلمة أخرى.')}</div>
          )}
          {results.length === 0 && query.length < 2 && (
            <div className="py-6 px-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">{tr('Go to', 'اذهب إلى')}</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: tr('Money requests', 'طلبات المال'), href: '/operations' },
                  { label: tr('Clients', 'الزبائن'), href: '/clients' },
                  { label: tr('Banks and cash', 'البنوك والصناديق'), href: '/treasury' },
                  { label: tr('Profit and reports', 'الأرباح والتقارير'), href: '/reports' },
                  { label: tr('Close the day', 'إغلاق اليوم'), href: '/eod' },
                ].map((s) => (
                  <button
                    key={s.href}
                    onClick={() => handleSelect(s.href)}
                    className="rounded-lg border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-accent/60"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {results.map((r, i) => {
            const Icon = TYPE_ICONS[r.type];
            return (
              <button
                key={r.id}
                onClick={() => handleSelect(r.href)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors',
                  i === selected ? 'bg-accent/60' : 'hover:bg-accent/40',
                )}
              >
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted', TYPE_COLORS[r.type])}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  {r.subtitle && <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>}
                </div>
                {r.meta && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{r.meta}</span>
                )}
              </button>
            );
          })}
        </div>

        {results.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground flex gap-3">
            <span>↑↓ {tr('move', 'تنقّل')}</span>
            <span>↵ {tr('open', 'فتح')}</span>
            <span>ESC {tr('close', 'إغلاق')}</span>
          </div>
        )}
      </div>
    </>
  );
}
