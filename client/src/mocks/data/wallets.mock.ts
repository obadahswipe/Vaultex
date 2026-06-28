export const mockWallets = [
  { id: 'w1', client_id: 'c1', client_name: 'John Smith', client_code: 'CLI001', currency: 'USD', balance: 12500.00, pending_balance: 0, is_active: true },
  { id: 'w2', client_id: 'c2', client_name: 'Maria Garcia', client_code: 'CLI002', currency: 'USD', balance: 45200.00, pending_balance: 5000.00, is_active: true },
  { id: 'w3', client_id: 'c2', client_name: 'Maria Garcia', client_code: 'CLI002', currency: 'EUR', balance: 8000.00, pending_balance: 0, is_active: true },
  { id: 'w4', client_id: 'c3', client_name: 'Ali Hassan', client_code: 'CLI003', currency: 'USD', balance: 0, pending_balance: 0, is_active: true },
  { id: 'w5', client_id: 'c4', client_name: 'Chen Wei', client_code: 'CLI004', currency: 'USD', balance: 98000.00, pending_balance: 10000.00, is_active: true },
];

export const mockWalletTransactions = [
  { id: 'wt1', wallet_id: 'w1', transaction_type: 'DEPOSIT', amount: 5000, currency: 'USD', balance_after: 12500, narration: 'Bank transfer', created_at: '2026-06-20T10:00:00Z' },
  { id: 'wt2', wallet_id: 'w1', transaction_type: 'FUND_ACCOUNT', amount: -2000, currency: 'USD', balance_after: 10500, narration: 'Funded MT5 #10001', created_at: '2026-06-22T14:00:00Z' },
  { id: 'wt3', wallet_id: 'w2', transaction_type: 'DEPOSIT', amount: 50000, currency: 'USD', balance_after: 50200, narration: 'Wire transfer', created_at: '2026-06-18T09:00:00Z' },
  { id: 'wt4', wallet_id: 'w2', transaction_type: 'WITHDRAWAL', amount: -5000, currency: 'USD', balance_after: 45200, narration: 'Client withdrawal request', created_at: '2026-06-27T11:00:00Z' },
];
