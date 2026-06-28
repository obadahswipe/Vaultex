export const mockLeads = [
  { id: 'l1', full_name: 'Robert Chen', email: 'rchen@email.com', phone: '+971501234567', country: 'AE', source: 'WEBSITE', status: 'NEW', assigned_to_name: 'Rania Saad', expected_deposit: 10000, created_at: '2026-06-25T09:00:00Z' },
  { id: 'l2', full_name: 'Fatima Al Zaabi', email: 'fatima@email.com', phone: '+97150987654', country: 'AE', source: 'IB', status: 'CONTACTED', ib_name: 'Gulf IB Group', assigned_to_name: 'Rania Saad', expected_deposit: 25000, created_at: '2026-06-24T11:00:00Z' },
  { id: 'l3', full_name: 'Thomas Müller', email: 'tmuller@email.com', phone: '+4917612345', country: 'DE', source: 'REFERRAL', status: 'QUALIFIED', assigned_to_name: 'Emily Clark', expected_deposit: 50000, created_at: '2026-06-23T14:00:00Z' },
  { id: 'l4', full_name: 'Priya Sharma', email: 'priya.s@email.com', phone: '+919876543210', country: 'IN', source: 'SOCIAL', status: 'PROPOSAL', assigned_to_name: 'Rania Saad', expected_deposit: 5000, created_at: '2026-06-20T10:00:00Z' },
  { id: 'l5', full_name: 'Carlos Rivera', email: 'crivera@email.com', phone: '+525512345678', country: 'MX', source: 'COLD_CALL', status: 'CONVERTED', assigned_to_name: 'Emily Clark', expected_deposit: 15000, created_at: '2026-06-10T09:00:00Z' },
  { id: 'l6', full_name: 'Nadia Popescu', email: 'nadia.p@email.com', phone: '+40721234567', country: 'RO', source: 'WEBSITE', status: 'LOST', assigned_to_name: 'Rania Saad', expected_deposit: 8000, created_at: '2026-06-01T11:00:00Z' },
];

export const mockActivities = [
  { id: 'a1', entity_type: 'LEAD', entity_id: 'l1', activity_type: 'CALL', subject: 'Initial contact call', outcome: 'Interested, requested info pack', performed_by_name: 'Rania Saad', completed_at: '2026-06-25T10:30:00Z', duration_min: 15 },
  { id: 'a2', entity_type: 'LEAD', entity_id: 'l2', activity_type: 'EMAIL', subject: 'Welcome email sent', performed_by_name: 'Rania Saad', completed_at: '2026-06-24T12:00:00Z' },
  { id: 'a3', entity_type: 'LEAD', entity_id: 'l3', activity_type: 'MEETING', subject: 'Video demo session', outcome: 'Very positive, sending proposal', performed_by_name: 'Emily Clark', completed_at: '2026-06-23T15:00:00Z', duration_min: 60 },
  { id: 'a4', entity_type: 'CLIENT', entity_id: 'c1', activity_type: 'CALL', subject: 'Account review call', outcome: 'Happy, considering adding funds', performed_by_name: 'Rania Saad', completed_at: '2026-06-22T11:00:00Z', duration_min: 20 },
];

export const mockTickets = [
  { id: 't1', entity_type: 'CLIENT', subject: 'Withdrawal not received after 5 days', priority: 'HIGH', status: 'IN_PROGRESS', category: 'WITHDRAWAL', assigned_to_name: 'Layla Khalid', created_at: '2026-06-26T09:00:00Z' },
  { id: 't2', entity_type: 'CLIENT', subject: 'Unable to login to MT5', priority: 'MEDIUM', status: 'OPEN', category: 'TECHNICAL', assigned_to_name: null, created_at: '2026-06-27T14:00:00Z' },
  { id: 't3', entity_type: 'CLIENT', subject: 'KYC documents uploaded, pending review', priority: 'LOW', status: 'WAITING_CLIENT', category: 'COMPLIANCE', assigned_to_name: 'Faris Nasser', created_at: '2026-06-25T11:00:00Z' },
  { id: 't4', entity_type: 'IB', subject: 'Commission calculation discrepancy - June', priority: 'URGENT', status: 'OPEN', category: 'ACCOUNT', assigned_to_name: 'Omar Hassan', created_at: '2026-06-28T08:00:00Z' },
  { id: 't5', entity_type: 'CLIENT', subject: 'Request for trading account upgrade', priority: 'LOW', status: 'RESOLVED', category: 'ACCOUNT', assigned_to_name: 'Layla Khalid', created_at: '2026-06-20T10:00:00Z' },
];
