import { useState } from 'react';
import {
  UserCheck, CalendarOff, Clock, DollarSign, Plus,
  CheckCircle, XCircle, Search, Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockEmployees, mockLeaveRequests, mockPayrollRuns } from '@/mocks/data/hr.mock';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

function EmployeeAvatar({ name, index }: { name: string; index: number }) {
  return (
    <div className={cn(
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
      AVATAR_COLORS[index % AVATAR_COLORS.length],
    )}>
      {name.charAt(0)}
    </div>
  );
}

function EmployeeStatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        Active
      </span>
    );
  }
  if (status === 'ON_LEAVE') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        On Leave
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
      Terminated
    </span>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
}

function PayrollStatusBadge({ status }: { status: string }) {
  if (status === 'DRAFT') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
        Draft
      </span>
    );
  }
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      Paid
    </span>
  );
}

export default function HR() {
  const [search, setSearch] = useState('');

  const activeCount  = mockEmployees.filter(e => e.status === 'ACTIVE').length;
  const onLeaveCount = mockEmployees.filter(e => e.status === 'ON_LEAVE').length;
  const pendingLeave = mockLeaveRequests.filter(l => l.status === 'PENDING').length;
  const totalPayroll = mockPayrollRuns[0]?.total_gross ?? 0;

  const filteredEmployees = mockEmployees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Human Resources"
        subtitle="Manage your team, leave requests, and payroll runs"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      <PageHint id="hr" icon="👥" title="Human Resources Module">
        Track employees, approve leave requests, and run payroll. All salary data is in USD unless otherwise stated.
        Use the Employees tab to manage headcount, Leave for request approvals, and Payroll for monthly runs.
      </PageHint>

      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 opacity-80" />
            <span className="text-sm font-medium opacity-80">Team Overview</span>
          </div>
          <p className="text-4xl font-bold tracking-tight">{mockEmployees.length} Team Members</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              {activeCount} Active
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              {onLeaveCount} On Leave
            </span>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-8 right-32 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Active Employees"
          value={activeCount}
          icon={UserCheck}
          accent="green"
          deltaLabel="currently working"
        />
        <StatCard
          label="On Leave"
          value={onLeaveCount}
          icon={CalendarOff}
          accent="amber"
          deltaLabel="approved leave"
        />
        <StatCard
          label="Pending Leave"
          value={pendingLeave}
          icon={Clock}
          accent="blue"
          deltaLabel="awaiting approval"
        />
        <StatCard
          label="Monthly Payroll"
          value={`$${totalPayroll.toLocaleString()}`}
          icon={DollarSign}
          accent="violet"
          deltaLabel="current period gross"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        {/* ── Employees tab ── */}
        <TabsContent value="employees" className="mt-4">
          <SectionCard
            title="All Employees"
            description="Full team roster across all branches and departments"
            padded={false}
          >
            {/* Search bar */}
            <div className="px-6 py-4 border-b border-border/40">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees…"
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp, i) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar name={emp.full_name} index={i} />
                        <div>
                          <p className="font-medium text-foreground">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.employment_type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{emp.employee_code}</span>
                    </TableCell>
                    <TableCell className="text-foreground">{emp.position}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.department_name}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.branch_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{emp.hire_date}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-foreground">
                        ${emp.base_salary?.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <EmployeeStatusBadge status={emp.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* ── Leave tab ── */}
        <TabsContent value="leave" className="mt-4">
          <SectionCard
            title="Leave Requests"
            description="Review and action employee leave applications"
            padded={false}
            action={
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Request Leave
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLeaveRequests.map(lr => (
                  <TableRow key={lr.id}>
                    <TableCell className="font-medium text-foreground">{lr.employee_name}</TableCell>
                    <TableCell className="text-muted-foreground">{lr.leave_type_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{lr.start_date}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{lr.end_date}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-foreground">{lr.days_requested}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lr.approved_by_name ?? <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell>
                      <LeaveStatusBadge status={lr.status} />
                    </TableCell>
                    <TableCell>
                      {lr.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                          >
                            <XCircle className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* ── Payroll tab ── */}
        <TabsContent value="payroll" className="mt-4">
          <SectionCard
            title="Payroll History"
            description="Monthly payroll runs and payment records"
            padded={false}
          >
            <div className="divide-y divide-border/40">
              {mockPayrollRuns.map(run => (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                  <div>
                    <p className="font-semibold text-foreground">
                      {run.period_start} → {run.period_end}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Payment date: {run.payment_date}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Employees</p>
                      <p className="mt-0.5 font-bold text-foreground">{mockEmployees.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Gross</p>
                      <p className="mt-0.5 font-bold font-mono text-foreground">
                        ${run.total_gross.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Net Pay</p>
                      <p className="mt-0.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ${run.total_net.toLocaleString()}
                      </p>
                    </div>
                    <PayrollStatusBadge status={run.status} />
                    <Button size="sm" variant="outline" className="text-xs">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
