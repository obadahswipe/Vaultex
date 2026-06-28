export const mockExposure = [
  { symbol: 'EURUSD', book_type: 'B', open_positions: 142, lots_buy: 85.4, lots_sell: 62.1, net_lots: 23.3, floating_pnl: -18420 },
  { symbol: 'XAUUSD', book_type: 'B', open_positions: 67, lots_buy: 12.5, lots_sell: 18.2, net_lots: -5.7, floating_pnl: 34800 },
  { symbol: 'USDJPY', book_type: 'B', open_positions: 89, lots_buy: 45.0, lots_sell: 41.3, net_lots: 3.7, floating_pnl: 5120 },
  { symbol: 'GBPUSD', book_type: 'B', open_positions: 53, lots_buy: 22.1, lots_sell: 28.4, net_lots: -6.3, floating_pnl: -9200 },
  { symbol: 'EURUSD', book_type: 'A', open_positions: 31, lots_buy: 18.0, lots_sell: 14.5, net_lots: 3.5, floating_pnl: -2100 },
  { symbol: 'BTCUSD', book_type: 'B', open_positions: 28, lots_buy: 8.2, lots_sell: 5.1, net_lots: 3.1, floating_pnl: 12600 },
];

export const mockRiskLimits = [
  { id: 'rl1', limit_type: 'MAX_BBOOK_EXPOSURE', symbol: null, limit_value: 5000000, currency: 'USD', alert_at_percent: 80, is_active: true },
  { id: 'rl2', limit_type: 'MAX_EXPOSURE_PER_SYMBOL', symbol: 'XAUUSD', limit_value: 1000000, currency: 'USD', alert_at_percent: 75, is_active: true },
  { id: 'rl3', limit_type: 'MAX_CLIENT_DRAWDOWN', symbol: null, limit_value: 500000, currency: 'USD', alert_at_percent: 80, is_active: true },
  { id: 'rl4', limit_type: 'MAX_DAILY_WITHDRAWAL', symbol: null, limit_value: 250000, currency: 'USD', alert_at_percent: 90, is_active: true },
];

export const mockRiskAlerts = [
  { id: 'ra1', limit_type: 'MAX_EXPOSURE_PER_SYMBOL', symbol: 'XAUUSD', alert_type: 'WARNING', current_value: 780000, limit_value: 1000000, percent_used: 78, is_resolved: false, created_at: '2026-06-28T08:15:00Z' },
  { id: 'ra2', limit_type: 'MAX_BBOOK_EXPOSURE', symbol: null, alert_type: 'WARNING', current_value: 4200000, limit_value: 5000000, percent_used: 84, is_resolved: false, created_at: '2026-06-28T09:30:00Z' },
];

export const mockTopLossClients = [
  { id: 'c5', full_name: 'Vladimir Petrov', client_code: 'CLI005', total_pnl: -42300, trade_count: 187 },
  { id: 'c8', full_name: 'Park Ji-Ho', client_code: 'CLI008', total_pnl: -28100, trade_count: 94 },
  { id: 'c12', full_name: 'Amr Khalil', client_code: 'CLI012', total_pnl: -19800, trade_count: 213 },
  { id: 'c3', full_name: 'Ali Hassan', client_code: 'CLI003', total_pnl: -14500, trade_count: 67 },
  { id: 'c19', full_name: 'Nicolás Gómez', client_code: 'CLI019', total_pnl: -11200, trade_count: 45 },
];
