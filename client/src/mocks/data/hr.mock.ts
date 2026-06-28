export const mockEmployees = [
  { id: 'e1', employee_code: 'EMP001', full_name: 'Ahmed Al Rashid', position: 'General Manager', branch_name: 'Dubai HQ', department_name: 'Operations', employment_type: 'FULL_TIME', hire_date: '2020-01-15', base_salary: 25000, salary_currency: 'USD', status: 'ACTIVE' },
  { id: 'e2', employee_code: 'EMP002', full_name: 'Omar Hassan', position: 'CFO', branch_name: 'Dubai HQ', department_name: 'Finance', employment_type: 'FULL_TIME', hire_date: '2020-03-01', base_salary: 22000, salary_currency: 'USD', status: 'ACTIVE' },
  { id: 'e3', employee_code: 'EMP003', full_name: 'Layla Khalid', position: 'Operations Manager', branch_name: 'Dubai HQ', department_name: 'Operations', employment_type: 'FULL_TIME', hire_date: '2021-06-01', base_salary: 15000, salary_currency: 'USD', status: 'ACTIVE' },
  { id: 'e4', employee_code: 'EMP004', full_name: 'Rania Saad', position: 'Sales Manager', branch_name: 'Dubai HQ', department_name: 'Sales', employment_type: 'FULL_TIME', hire_date: '2021-09-15', base_salary: 12000, salary_currency: 'USD', status: 'ACTIVE' },
  { id: 'e5', employee_code: 'EMP005', full_name: 'Faris Nasser', position: 'Compliance Officer', branch_name: 'Dubai HQ', department_name: 'Compliance', employment_type: 'FULL_TIME', hire_date: '2022-01-10', base_salary: 13000, salary_currency: 'USD', status: 'ACTIVE' },
  { id: 'e6', employee_code: 'EMP006', full_name: 'Sarah Williams', position: 'UK Branch Manager', branch_name: 'London Office', department_name: 'Operations', employment_type: 'FULL_TIME', hire_date: '2022-04-01', base_salary: 18000, salary_currency: 'USD', status: 'ACTIVE' },
  { id: 'e7', employee_code: 'EMP007', full_name: 'James Hartley', position: 'Risk Manager', branch_name: 'London Office', department_name: 'Risk', employment_type: 'FULL_TIME', hire_date: '2023-01-05', base_salary: 16000, salary_currency: 'USD', status: 'ON_LEAVE' },
];

export const mockLeaveRequests = [
  { id: 'lr1', employee_name: 'James Hartley', leave_type_name: 'Annual Leave', start_date: '2026-07-01', end_date: '2026-07-14', days_requested: 10, status: 'APPROVED', approved_by_name: 'Sarah Williams' },
  { id: 'lr2', employee_name: 'Rania Saad', leave_type_name: 'Annual Leave', start_date: '2026-07-20', end_date: '2026-07-24', days_requested: 5, status: 'PENDING', approved_by_name: null },
  { id: 'lr3', employee_name: 'Layla Khalid', leave_type_name: 'Sick Leave', start_date: '2026-06-26', end_date: '2026-06-27', days_requested: 2, status: 'APPROVED', approved_by_name: 'Ahmed Al Rashid' },
];

export const mockPayrollRuns = [
  { id: 'pr1', period_start: '2026-06-01', period_end: '2026-06-30', currency: 'USD', total_gross: 121000, total_net: 121000, status: 'APPROVED', payment_date: '2026-06-28' },
  { id: 'pr2', period_start: '2026-05-01', period_end: '2026-05-31', currency: 'USD', total_gross: 121000, total_net: 121000, status: 'PAID', payment_date: '2026-05-28' },
  { id: 'pr3', period_start: '2026-04-01', period_end: '2026-04-30', currency: 'USD', total_gross: 118000, total_net: 118000, status: 'PAID', payment_date: '2026-04-28' },
];
