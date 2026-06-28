import { useState } from 'react';
import { Building2, Users, Globe, MapPin, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockBranches, mockDepartments } from '@/mocks/data/branches.mock';
import { cn } from '@/lib/utils';

export default function Branches() {
  const [expanded, setExpanded] = useState<string | null>('b1');

  const deptsByBranch = (branchId: string) =>
    mockDepartments.filter((d) => d.branch_id === branchId);

  const totalBranches = mockBranches.length;
  const totalDepts = mockDepartments.length;
  const countries = new Set(mockBranches.map((b) => b.country)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Branches & Departments"
        subtitle="Manage your organisation's geographic and functional structure"
        hint={
          <PageHint id="branches" icon="🏢" title="What is this page?">
            This page shows all physical offices and the departments that operate within them.
            Expand a branch to see its departments, or switch to the Departments tab for a flat
            view across the whole organisation.
          </PageHint>
        }
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Branch
          </Button>
        }
      />

      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/70">Organisation Overview</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Global Presence</h2>
          <p className="mt-1 text-sm text-white/60">All offices and teams in one view</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Building2 className="h-3.5 w-3.5" /> {totalBranches} Offices
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Users className="h-3.5 w-3.5" /> {totalDepts} Departments
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Globe className="h-3.5 w-3.5" /> {countries} Countries
            </span>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Branches" value={totalBranches} icon={Building2} accent="blue" />
        <StatCard label="Active Departments" value={totalDepts} icon={Users} accent="green" />
        <StatCard label="Countries" value={countries} icon={Globe} accent="violet" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        {/* ── Branches tab ── */}
        <TabsContent value="branches" className="space-y-3">
          <SectionCard
            title="All Branches"
            description="Click a branch to expand and view its departments"
            padded={false}
          >
            <div className="divide-y divide-border/50">
              {mockBranches.map((branch) => {
                const depts = deptsByBranch(branch.id);
                const isOpen = expanded === branch.id;

                return (
                  <div key={branch.id}>
                    <button
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-accent/30"
                      onClick={() => setExpanded(isOpen ? null : branch.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{branch.name}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {branch.city}, {branch.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden text-center sm:block">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Code</p>
                          <p className="font-mono text-sm font-bold text-foreground">{branch.code}</p>
                        </div>
                        <div className="hidden text-center sm:block">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Manager</p>
                          <p className="text-sm text-foreground">{branch.manager_name}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Depts</p>
                          <p className="text-sm font-bold text-foreground">{branch.department_count}</p>
                        </div>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          branch.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {branch.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {isOpen
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/50 bg-muted/20 px-6 pb-5 pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <Users className="h-3.5 w-3.5" /> Departments in {branch.name}
                          </p>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary">
                            <Plus className="h-3 w-3" /> Add Department
                          </Button>
                        </div>
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                          {depts.map((dept) => (
                            <div
                              key={dept.id}
                              className="flex items-start justify-between rounded-xl border border-border/60 bg-card p-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{dept.name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Head: {dept.head_name || '—'}
                                </p>
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground/60">{dept.code}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Departments tab ── */}
        <TabsContent value="departments">
          <SectionCard title="All Departments" description="Flat view across the entire organisation" padded={false}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium text-foreground">{dept.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{dept.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dept.branch_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dept.head_name || '—'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          dept.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
