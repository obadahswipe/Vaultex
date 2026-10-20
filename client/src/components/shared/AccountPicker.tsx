import { NativeSelect } from './form';
import { useLedger } from '@/lib/data/hooks';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { CATEGORY_LABEL } from '@/lib/data/labels';
import { fmtMoney } from '@/lib/data/money';
import type { Category } from '@/lib/data/types';

interface AccountPickerProps {
  value: string;
  onChange: (code: string) => void;
  categories: Category[];
  placeholder?: string;
  exclude?: string[];
  showBalance?: boolean;
  id?: string;
}

/** A dropdown of accounts, grouped by kind, with their balance next to each name. */
export function AccountPicker({ value, onChange, categories, placeholder, exclude = [], showBalance = true, id }: AccountPickerProps) {
  const { accounts, balances } = useLedger();
  const { tr, nameOf } = useTranslation();
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder ?? tr('Choose…', 'اختر…')}</option>
      {categories.map((cat) => {
        const list = accounts.filter((a) => a.category === cat && a.active && !exclude.includes(a.code));
        if (!list.length) return null;
        return (
          <optgroup key={cat} label={tr(CATEGORY_LABEL[cat].en, CATEGORY_LABEL[cat].ar)}>
            {list.map((a) => (
              <option key={a.code} value={a.code}>
                {nameOf(a)}{showBalance ? ` — ${fmtMoney(balances[a.code] ?? 0, a.currency)}` : ''}
              </option>
            ))}
          </optgroup>
        );
      })}
    </NativeSelect>
  );
}
