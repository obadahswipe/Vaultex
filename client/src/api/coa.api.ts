import { api } from './client';
import { mockCOA } from '@/mocks/data/reports.mock';

export interface COAAccount {
  id: string; code: string; name: string; type: string; subtype?: string;
  normal_balance: string; parent_id?: string; is_system: boolean; is_active: boolean;
  parent_code?: string; parent_name?: string;
  total_debit?: string; total_credit?: string; balance?: string;
}

/* In-memory store for demo mutations */
let _mockAccounts = [...mockCOA.accounts] as COAAccount[];

export const getCOA = (q: { type?: string; is_system?: boolean; is_active?: boolean } = {}) => {
  if (import.meta.env.PROD) {
    let filtered = _mockAccounts;
    if (q.type)      filtered = filtered.filter((a) => a.type === q.type);
    if (q.is_active !== undefined) filtered = filtered.filter((a) => a.is_active === q.is_active);
    return Promise.resolve({ accounts: filtered });
  }
  return api.get<{ success: boolean; data: { accounts: COAAccount[] } }>('/chart-of-accounts', { params: q }).then((r) => r.data.data);
};

export const getCOAAccount = (id: string) => {
  if (import.meta.env.PROD) {
    const a = _mockAccounts.find((x) => x.id === id);
    if (!a) return Promise.reject(new Error('Account not found'));
    return Promise.resolve({ ...a, total_debit: '45200.00', total_credit: '0.00', balance: '45200.00' });
  }
  return api.get<{ success: boolean; data: COAAccount }>(`/chart-of-accounts/${id}`).then((r) => r.data.data);
};

export const createCOAAccount = (data: Partial<COAAccount>) => {
  if (import.meta.env.PROD) {
    if (!data.code || !data.name || !data.type || !data.normal_balance)
      return Promise.reject(new Error('code, name, type, normal_balance required'));
    if (_mockAccounts.find((a) => a.code === data.code))
      return Promise.reject(new Error('Account code already exists'));
    const newAcct: COAAccount = {
      id: `coa-${data.code}`, code: data.code!, name: data.name!, type: data.type!,
      subtype: data.subtype, normal_balance: data.normal_balance!,
      is_system: false, is_active: true,
    };
    _mockAccounts = [..._mockAccounts, newAcct];
    return Promise.resolve(newAcct);
  }
  return api.post<{ success: boolean; data: COAAccount }>('/chart-of-accounts', data).then((r) => r.data.data);
};

export const updateCOAAccount = (id: string, data: { name?: string; is_active?: boolean }) => {
  if (import.meta.env.PROD) {
    const idx = _mockAccounts.findIndex((a) => a.id === id);
    if (idx === -1) return Promise.reject(new Error('Account not found'));
    if (_mockAccounts[idx].is_system && data.is_active === false)
      return Promise.reject(new Error('System accounts cannot be deactivated'));
    _mockAccounts[idx] = { ..._mockAccounts[idx], ...data };
    return Promise.resolve(_mockAccounts[idx]);
  }
  return api.patch<{ success: boolean; data: COAAccount }>(`/chart-of-accounts/${id}`, data).then((r) => r.data.data);
};
