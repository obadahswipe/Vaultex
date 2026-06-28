export const mockBranches = [
  { id: 'b1', name: 'Dubai HQ', code: 'DXB', country: 'AE', city: 'Dubai', manager_name: 'Ahmed Al Rashid', department_count: 5, is_active: true },
  { id: 'b2', name: 'London Office', code: 'LON', country: 'GB', city: 'London', manager_name: 'Sarah Williams', department_count: 3, is_active: true },
  { id: 'b3', name: 'Istanbul Branch', code: 'IST', country: 'TR', city: 'Istanbul', manager_name: 'Mehmet Yilmaz', department_count: 2, is_active: true },
];

export const mockDepartments = [
  { id: 'd1', branch_id: 'b1', branch_name: 'Dubai HQ', name: 'Finance', code: 'FIN', head_name: 'Omar Hassan', is_active: true },
  { id: 'd2', branch_id: 'b1', branch_name: 'Dubai HQ', name: 'Operations', code: 'OPS', head_name: 'Layla Khalid', is_active: true },
  { id: 'd3', branch_id: 'b1', branch_name: 'Dubai HQ', name: 'Sales', code: 'SAL', head_name: 'Rania Saad', is_active: true },
  { id: 'd4', branch_id: 'b1', branch_name: 'Dubai HQ', name: 'Compliance', code: 'COM', head_name: 'Faris Nasser', is_active: true },
  { id: 'd5', branch_id: 'b1', branch_name: 'Dubai HQ', name: 'Technology', code: 'TEC', head_name: 'Tariq Mansour', is_active: true },
  { id: 'd6', branch_id: 'b2', branch_name: 'London Office', name: 'Risk', code: 'RSK', head_name: 'James Hartley', is_active: true },
  { id: 'd7', branch_id: 'b2', branch_name: 'London Office', name: 'Client Services', code: 'CS', head_name: 'Emily Clark', is_active: true },
  { id: 'd8', branch_id: 'b3', branch_name: 'Istanbul Branch', name: 'IB Relations', code: 'IBR', head_name: 'Ayse Demir', is_active: true },
];
