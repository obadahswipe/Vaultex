import { useState } from 'react';
import {
  Users, TrendingUp, Ticket, Plus,
  Phone, Mail, Video, FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockLeads, mockActivities, mockTickets } from '@/mocks/data/crm.mock';
import { cn } from '@/lib/utils';

/* ── badge helpers ── */
const LEAD_STATUS_BADGE: Record<string, string> = {
  NEW:       'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  CONTACTED: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  QUALIFIED: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  PROPOSAL:  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  CONVERTED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  LOST:      'bg-muted text-muted-foreground',
};

const TICKET_PRIORITY_BADGE: Record<string, string> = {
  LOW:    'bg-muted text-muted-foreground',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  HIGH:   'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  URGENT: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

const TICKET_STATUS_BADGE: Record<string, string> = {
  OPEN:           'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  IN_PROGRESS:    'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  WAITING_CLIENT: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  RESOLVED:       'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  CLOSED:         'bg-muted text-muted-foreground',
};

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  CALL: Phone, EMAIL: Mail, MEETING: Video, NOTE: FileText,
  TASK: FileText, FOLLOW_UP: Phone, DEMO: Video,
};

const SOURCE_BADGE = 'bg-primary/10 text-primary';

const LEAD_FILTERS = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'CONVERTED', 'LOST'] as const;

export default function CRM() {
  const [leadFilter, setLeadFilter] = useState<string>('ALL');

  const activeLeads    = mockLeads.filter((l) => !['CONVERTED', 'LOST'].includes(l.status)).length;
  const convertedLeads = mockLeads.filter((l) => l.status === 'CONVERTED').length;
  const openTickets    = mockTickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length;

  const filteredLeads = leadFilter === 'ALL'
    ? mockLeads
    : mockLeads.filter((l) => l.status === leadFilter);

  return (
    <div className="space-y-8">
      <PageHeader
        title="CRM"
        subtitle="Leads, activities, and client support tickets"
        hint={
          <PageHint id="crm" icon="🤝" title="What is this page?">
            Track potential clients from first contact through to conversion. Log calls, emails,
            and meetings in Activities, and manage support requests in Tickets.
          </PageHint>
        }
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Lead
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Active Leads"    value={activeLeads}       icon={Users}      accent="blue" />
        <StatCard label="Converted"       value={convertedLeads}    icon={TrendingUp} accent="green" delta={12.5} deltaLabel="vs last month" />
        <StatCard label="Open Tickets"    value={openTickets}       icon={Ticket}     accent="amber" />
        <StatCard label="Activities Today" value={mockActivities.length} icon={Phone} accent="violet" />
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>

        {/* ── Leads tab ── */}
        <TabsContent value="leads" className="space-y-4">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {LEAD_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setLeadFilter(s)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  leadFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent/60',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <SectionCard
            title="Leads Pipeline"
            description={`${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''} matching filter`}
            padded={false}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No leads match this filter
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-accent/30">
                        <TableCell>
                          <p className="font-medium text-foreground">{lead.full_name}</p>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.country}</TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            SOURCE_BADGE,
                          )}>
                            {lead.source?.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.assigned_to_name || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {lead.expected_deposit ? `$${lead.expected_deposit.toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            LEAD_STATUS_BADGE[lead.status] ?? 'bg-muted text-muted-foreground',
                          )}>
                            {lead.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Activities tab ── */}
        <TabsContent value="activities">
          <SectionCard
            title="Activity Log"
            description="All calls, emails, meetings, and notes"
            action={
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Log Activity
              </Button>
            }
          >
            <div className="space-y-4">
              {mockActivities.map((act, idx) => {
                const Icon = ACTIVITY_ICONS[act.activity_type] ?? Phone;
                const isLast = idx === mockActivities.length - 1;

                return (
                  <div key={act.id} className="relative flex gap-4">
                    {/* Timeline connector */}
                    {!isLast && (
                      <div
                        aria-hidden
                        className="absolute left-[18px] top-10 h-full w-px bg-border/50"
                      />
                    )}

                    {/* Icon circle */}
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            'bg-primary/10 text-primary',
                          )}>
                            {act.activity_type}
                          </span>
                          <p className="text-sm font-medium text-foreground">{act.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {act.completed_at
                            ? new Date(act.completed_at).toLocaleDateString()
                            : 'Scheduled'}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {act.entity_type} · by {act.performed_by_name}
                        {act.duration_min ? ` · ${act.duration_min} min` : ''}
                      </p>
                      {act.outcome && (
                        <p className="mt-1.5 text-xs italic text-muted-foreground/80">
                          "{act.outcome}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Tickets tab ── */}
        <TabsContent value="tickets">
          <SectionCard
            title="Support Tickets"
            description="Client and IB support requests"
            action={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Ticket
              </Button>
            }
            padded={false}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell>
                        <p className="font-medium text-foreground text-sm">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.entity_type}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ticket.category}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          TICKET_PRIORITY_BADGE[ticket.priority] ?? 'bg-muted text-muted-foreground',
                        )}>
                          {ticket.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          TICKET_STATUS_BADGE[ticket.status] ?? 'bg-muted text-muted-foreground',
                        )}>
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ticket.assigned_to_name ?? (
                          <span className="text-muted-foreground/50">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {new Date(ticket.created_at).toLocaleDateString()}
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
