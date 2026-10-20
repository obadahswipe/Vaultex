import { useMemo } from 'react';
import { useBooks } from '@/stores/books.store';
import { ALL_NAV_ITEMS } from '@/components/layout/nav';
import { useTranslation } from '@/lib/i18n/useTranslation';

export type SearchResultType = 'page' | 'account' | 'client' | 'ib' | 'request' | 'voucher';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

const has = (q: string, ...values: (string | undefined)[]) =>
  values.some((v) => v && v.toLowerCase().includes(q));

export function useUniversalSearch(query: string) {
  const accounts = useBooks((s) => s.accounts);
  const requests = useBooks((s) => s.requests);
  const entries = useBooks((s) => s.entries);
  const clients = useBooks((s) => s.clients);
  const ibs = useBooks((s) => s.ibs);
  const { tr, nameOf } = useTranslation();

  return useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];

    ALL_NAV_ITEMS.filter((p) => has(q, p.en, p.ar, p.helpEn, p.helpAr)).slice(0, 4).forEach((p) => {
      out.push({ id: `page-${p.to}`, type: 'page', title: tr(p.en, p.ar), subtitle: tr(p.helpEn, p.helpAr), href: p.to });
    });
    if (q.length < 2) return out;

    clients.filter((c) => has(q, c.name, c.arabic, c.accountNo, c.email, c.mt5Login)).slice(0, 5).forEach((c) => {
      out.push({ id: `cl-${c.id}`, type: 'client', title: nameOf(c), subtitle: c.email, href: `/clients?account=${c.accountNo}`, meta: c.accountNo });
    });
    ibs.filter((ib) => has(q, ib.name, ib.arabic, ib.mt5AccountNo)).slice(0, 3).forEach((ib) => {
      out.push({ id: `ib-${ib.id}`, type: 'ib', title: nameOf(ib), subtitle: tr('Partner', 'شريك'), href: '/ib-mgmt', meta: ib.mt5AccountNo });
    });
    accounts
      .filter((a) => a.category !== 'clients' && has(q, a.code, a.name, a.arabic))
      .slice(0, 4)
      .forEach((a) => {
        out.push({ id: `acc-${a.code}`, type: 'account', title: nameOf(a), subtitle: tr('Account', 'حساب'), href: `/entries?account=${a.code}`, meta: a.code });
      });
    const num = q.replace(/^#|^req-?|^v-?/i, '');
    requests.filter((r) => String(r.requestNo) === num || has(q, r.note)).slice(0, 3).forEach((r) => {
      out.push({ id: `req-${r.id}`, type: 'request', title: tr(`Money request #${r.requestNo}`, `طلب مال رقم ${r.requestNo}`), subtitle: r.lines.map((l) => l.accountName).join(', '), href: `/operations?open=${r.id}`, meta: r.date });
    });
    entries.filter((e) => String(e.no) === num).slice(0, 2).forEach((e) => {
      out.push({ id: `je-${e.id}`, type: 'voucher', title: tr(`Entry ${e.no}`, `القيد ${e.no}`), subtitle: e.memo, href: `/entries?no=${e.no}`, meta: e.date });
    });
    return out;
  }, [query, accounts, requests, entries, clients, ibs, tr, nameOf]);
}
