import { useEffect } from 'react';
import { X, Command } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Shortcut {
  keys: string[];
  en: string;
  ar: string;
  group: 'go' | 'all';
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['G', 'H'], en: 'Go to Home',             ar: 'اذهب إلى الرئيسية',      group: 'go' },
  { keys: ['G', 'O'], en: 'Go to Money requests',   ar: 'اذهب إلى طلبات المال',   group: 'go' },
  { keys: ['G', 'C'], en: 'Go to Clients',          ar: 'اذهب إلى الزبائن',       group: 'go' },
  { keys: ['G', 'B'], en: 'Go to Banks and cash',   ar: 'اذهب إلى البنوك والصناديق', group: 'go' },
  { keys: ['G', 'E'], en: 'Go to Entries',          ar: 'اذهب إلى القيود',        group: 'go' },
  { keys: ['G', 'R'], en: 'Go to Reports',          ar: 'اذهب إلى التقارير',      group: 'go' },
  { keys: ['G', 'T'], en: 'Go to Trades',           ar: 'اذهب إلى الصفقات',       group: 'go' },
  { keys: ['⌘', 'K'], en: 'Search',                 ar: 'بحث',                   group: 'all' },
  { keys: ['?'],      en: 'Show this list',         ar: 'اعرض هذه القائمة',       group: 'all' },
  { keys: ['Esc'],    en: 'Close a window',         ar: 'أغلق النافذة',           group: 'all' },
];

interface KeyboardHelpModalProps {
  open: boolean;
  onClose: () => void;
}

function Key({ k }: { k: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground shadow-[0_1px_0_1px_hsl(var(--border))]">
      {k}
    </kbd>
  );
}

export function KeyboardHelpModal({ open, onClose }: KeyboardHelpModalProps) {
  const { tr } = useTranslation();
  const groups = [
    { id: 'go' as const, en: 'Move around', ar: 'التنقل' },
    { id: 'all' as const, en: 'Everywhere', ar: 'في كل مكان' },
  ];
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{tr('Keyboard shortcuts', 'اختصارات لوحة المفاتيح')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 max-h-[60vh] overflow-y-auto divide-x divide-border rtl:divide-x-reverse">
          {groups.map((g) => (
            <div key={g.id} className="p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tr(g.en, g.ar)}</p>
              <div className="space-y-2.5">
                {SHORTCUTS.filter((s) => s.group === g.id).map((s) => (
                  <div key={s.en} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-foreground/80">{tr(s.en, s.ar)}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k) => <Key key={k} k={k} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {tr('Press Esc or ? to close.', 'اضغط Esc أو ? للإغلاق.')}
          </p>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            {tr('Close', 'إغلاق')}
          </button>
        </div>
      </div>
    </>
  );
}
