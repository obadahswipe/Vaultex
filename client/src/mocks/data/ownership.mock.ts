export const mockShareholders = [
  { id: 'sh1', full_name: 'Mohammed Al Farsi', email: 'mfarsi@example.com', nationality: 'AE', shareholder_type: 'INDIVIDUAL', ownership_percent: 40, share_class: 'ORDINARY', share_count: 40000, face_value: 1, total_contributed_usd: 2000000 },
  { id: 'sh2', full_name: 'GCC Capital Ltd', email: 'info@gcccapital.ae', nationality: 'AE', shareholder_type: 'COMPANY', company_name: 'GCC Capital Ltd', ownership_percent: 35, share_class: 'PREFERRED', share_count: 35000, face_value: 1, total_contributed_usd: 1750000 },
  { id: 'sh3', full_name: 'Elena Petrov', email: 'epetrov@email.com', nationality: 'RU', shareholder_type: 'INDIVIDUAL', ownership_percent: 15, share_class: 'ORDINARY', share_count: 15000, face_value: 1, total_contributed_usd: 750000 },
  { id: 'sh4', full_name: 'David Okafor', email: 'dokafor@email.com', nationality: 'NG', shareholder_type: 'INDIVIDUAL', ownership_percent: 10, share_class: 'ORDINARY', share_count: 10000, face_value: 1, total_contributed_usd: 500000 },
];

export const mockCapitalContributions = [
  { id: 'cc1', shareholder_name: 'Mohammed Al Farsi', contribution_type: 'INITIAL_CAPITAL', amount: 2000000, currency: 'USD', amount_usd: 2000000, contribution_date: '2020-01-15', bank_reference: 'WIRE-2020-001', narration: 'Initial capital injection' },
  { id: 'cc2', shareholder_name: 'GCC Capital Ltd', contribution_type: 'INITIAL_CAPITAL', amount: 1750000, currency: 'USD', amount_usd: 1750000, contribution_date: '2020-01-20', bank_reference: 'WIRE-2020-002', narration: 'Initial capital injection' },
  { id: 'cc3', shareholder_name: 'Elena Petrov', contribution_type: 'ADDITIONAL_CAPITAL', amount: 250000, currency: 'USD', amount_usd: 250000, contribution_date: '2022-06-01', bank_reference: 'WIRE-2022-015', narration: 'Capital increase – expansion fund' },
  { id: 'cc4', shareholder_name: 'David Okafor', contribution_type: 'ADDITIONAL_CAPITAL', amount: 200000, currency: 'USD', amount_usd: 200000, contribution_date: '2023-03-10', bank_reference: 'WIRE-2023-008', narration: 'Additional capital' },
];

export const mockDistributions = [
  { id: 'pd1', period_start: '2025-01-01', period_end: '2025-12-31', total_profit: 1200000, distributable_amount: 900000, distribution_date: '2026-03-15', status: 'PAID', items: [
    { shareholder: 'Mohammed Al Farsi', percent: 40, amount: 360000, status: 'PAID' },
    { shareholder: 'GCC Capital Ltd',   percent: 35, amount: 315000, status: 'PAID' },
    { shareholder: 'Elena Petrov',      percent: 15, amount: 135000, status: 'PAID' },
    { shareholder: 'David Okafor',      percent: 10, amount: 90000,  status: 'PAID' },
  ]},
];
