export const mockAssets = [
  { id: 'a1', asset_code: 'AST001', name: 'Dell PowerEdge Server', category_name: 'IT Equipment', branch_name: 'Dubai HQ', department_name: 'Technology', purchase_date: '2023-01-15', purchase_cost: 15000, cost_usd: 15000, currency: 'USD', useful_life_years: 5, salvage_value: 1500, accumulated_depreciation: 5600, net_book_value: 9400, status: 'ACTIVE', serial_number: 'SRV-2023-001', assigned_to_name: 'Tariq Mansour' },
  { id: 'a2', asset_code: 'AST002', name: 'Office Fit-Out – Dubai HQ', category_name: 'Leasehold Improvements', branch_name: 'Dubai HQ', department_name: null, purchase_date: '2020-06-01', purchase_cost: 250000, cost_usd: 250000, currency: 'USD', useful_life_years: 10, salvage_value: 0, accumulated_depreciation: 150000, net_book_value: 100000, status: 'ACTIVE', serial_number: null, assigned_to_name: null },
  { id: 'a3', asset_code: 'AST003', name: 'Trading Workstation x10', category_name: 'IT Equipment', branch_name: 'Dubai HQ', department_name: 'Operations', purchase_date: '2024-01-10', purchase_cost: 30000, cost_usd: 30000, currency: 'USD', useful_life_years: 4, salvage_value: 3000, accumulated_depreciation: 5625, net_book_value: 24375, status: 'ACTIVE', serial_number: 'WS-2024-010', assigned_to_name: 'Layla Khalid' },
  { id: 'a4', asset_code: 'AST004', name: 'Mercedes E-Class', category_name: 'Vehicles', branch_name: 'Dubai HQ', department_name: null, purchase_date: '2022-09-01', purchase_cost: 85000, cost_usd: 85000, currency: 'USD', useful_life_years: 5, salvage_value: 25000, accumulated_depreciation: 48000, net_book_value: 37000, status: 'ACTIVE', serial_number: 'VIN-MB-2022', assigned_to_name: 'Ahmed Al Rashid' },
  { id: 'a5', asset_code: 'AST005', name: 'Old Printer – Canon', category_name: 'Office Equipment', branch_name: 'London Office', department_name: null, purchase_date: '2019-03-01', purchase_cost: 2500, cost_usd: 2500, currency: 'USD', useful_life_years: 5, salvage_value: 0, accumulated_depreciation: 2500, net_book_value: 0, status: 'DISPOSED', serial_number: 'PRN-CN-001', assigned_to_name: null },
];

export const mockAssetCategories = [
  { id: 'ac1', name: 'IT Equipment', depreciation_method: 'STRAIGHT_LINE', useful_life_years: 4 },
  { id: 'ac2', name: 'Office Equipment', depreciation_method: 'STRAIGHT_LINE', useful_life_years: 5 },
  { id: 'ac3', name: 'Vehicles', depreciation_method: 'DECLINING_BALANCE', useful_life_years: 5 },
  { id: 'ac4', name: 'Leasehold Improvements', depreciation_method: 'STRAIGHT_LINE', useful_life_years: 10 },
  { id: 'ac5', name: 'Furniture & Fixtures', depreciation_method: 'STRAIGHT_LINE', useful_life_years: 8 },
];
