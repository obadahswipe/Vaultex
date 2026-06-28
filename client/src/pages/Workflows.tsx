import { useState } from 'react';
import {
  Clock,
  GitBranch,
  CheckCircle,
  Layers,
  Plus,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Mock data ────────────────────────────────────────────────────────────────
const mockTemplates = [
  {
    id: 'wt1',
    name: 'Standard Deposit Flow',
    process_type: 'DEPOSIT',
    is_active: true,
    is_default: true,
    steps: [
      { step_order: 1, name: 'Finance Review',    step_type: 'APPROVAL', assigned_role: 'Finance' },
      { step_order: 2, name: 'Fund MT5 Account',  step_type: 'TASK',     assigned_role: 'Operations' },
      { step_order: 3, name: 'Post Accounting',   step_type: 'AUTO',     assigned_role: null },
    ],
  },
  {
    id: 'wt2',
    name: 'Withdrawal Approval',
    process_type: 'WITHDRAWAL',
    is_active: true,
    is_default: true,
    steps: [
      { step_order: 1, name: 'Compliance Check',  step_type: 'REVIEW',   assigned_role: 'Compliance' },
      { step_order: 2, name: 'CFO Approval',      step_type: 'APPROVAL', assigned_role: 'CFO' },
      { step_order: 3, name: 'Treasury Payment',  step_type: 'TASK',     assigned_role: 'Treasury' },
      { step_order: 4, name: 'Post Accounting',   step_type: 'AUTO',     assigned_role: null },
    ],
  },
  {
    id: 'wt3',
    name: 'KYC Verification',
    process_type: 'KYC_APPROVAL',
    is_active: true,
    is_default: true,
    steps: [
      { step_order: 1, name: 'Document Review',  step_type: 'REVIEW',   assigned_role: 'Compliance' },
      { step_order: 2, name: 'Final Approval',   step_type: 'APPROVAL', assigned_role: 'Compliance Manager' },
    ],
  },
];

const mockMyTasks = [
  { id: 'task1', step_name: 'Finance Review', process_type: 'DEPOSIT',     entity_id: 'PAY-2026-0891', status: 'PENDING', due_at: '2026-06-29T12:00:00Z', template_name: 'Standard Deposit Flow',  is_overdue: false },
  { id: 'task2', step_name: 'CFO Approval',   process_type: 'WITHDRAWAL',  entity_id: 'WD-2026-0234',  status: 'PENDING', due_at: '2026-06-28T17:00:00Z', template_name: 'Withdrawal Approval',   is_overdue: true },
  { id: 'task3', step_name: 'Document Review',process_type: 'KYC_APPROVAL',entity_id: 'CLI042',         status: 'PENDING', due_at: '2026-06-30T09:00:00Z', template_name: 'KYC Verification',     is_overdue: false },
];

const mockInstances = [
  { id: 'wi1', process_type: 'DEPOSIT',      entity_id: 'PAY-2026-0891', current_step: 1, total_steps: 3, status: 'IN_PROGRESS', template_name: 'Standard Deposit Flow',  started_at: '2026-06-28T09:00:00Z' },
  { id: 'wi2', process_type: 'WITHDRAWAL',   entity_id: 'WD-2026-0234',  current_step: 2, total_steps: 4, status: 'IN_PROGRESS', template_name: 'Withdrawal Approval',    started_at: '2026-06-27T14:00:00Z' },
  { id: 'wi3', process_type: 'DEPOSIT',      entity_id: 'PAY-2026-0880', current_step: 3, total_steps: 3, status: 'COMPLETED',   template_name: 'Standard Deposit Flow',  started_at: '2026-06-26T10:00:00Z' },
  { id: 'wi4', process_type: 'KYC_APPROVAL', entity_id: 'CLI041',        current_step: 1, total_steps: 2, status: 'REJECTED',    template_name: 'KYC Verification',       started_at: '2026-06-25T11:00:00Z' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function processTypeBadge(type: string) {
  const map: Record<string, string> = {
    DEPOSIT:     'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    WITHDRAWAL:  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    KYC_APPROVAL:'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  };
  return map[type] ?? 'bg-muted text-muted-foreground';
}

function processTypeBorderColor(type: string) {
  const map: Record<string, string> = {
    DEPOSIT:     'border-l-blue-500',
    WITHDRAWAL:  'border-l-amber-500',
    KYC_APPROVAL:'border-l-violet-500',
  };
  return map[type] ?? 'border-l-border';
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    COMPLETED:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    REJECTED:    'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    CANCELLED:   'bg-muted text-muted-foreground',
  };
  return map[status] ?? 'bg-muted text-muted-foreground';
}

function stepTypeBadge(type: string) {
  const map: Record<string, string> = {
    APPROVAL: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    REVIEW:   'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    TASK:     'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    AUTO:     'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  };
  return map[type] ?? 'bg-muted text-muted-foreground';
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Workflows() {
  const [dismissedTasks, setDismissedTasks] = useState<Set<string>>(new Set());

  const pendingCount  = mockMyTasks.filter((t) => !dismissedTasks.has(t.id)).length;
  const overdueCount  = mockMyTasks.filter((t) => t.is_overdue && !dismissedTasks.has(t.id)).length;
  const inProgress    = mockInstances.filter((i) => i.status === 'IN_PROGRESS').length;
  const completedToday= mockInstances.filter((i) => i.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <PageHeader
        title="Workflow Engine"
        subtitle="Approval queues, process tracking, and configurable templates"
        hint={
          <PageHint id="workflows" icon="⚡" title="What is this page?">
            The Workflow Engine manages multi-step approval processes for deposits,
            withdrawals, and KYC. Configure templates, track in-progress instances,
            and action tasks assigned to your role.
          </PageHint>
        }
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        }
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending My Action"
          value={pendingCount}
          icon={Clock}
          accent="amber"
        />
        <StatCard
          label="In Progress"
          value={inProgress}
          icon={GitBranch}
          accent="blue"
        />
        <StatCard
          label="Completed Today"
          value={completedToday}
          icon={CheckCircle}
          accent="green"
        />
        <StatCard
          label="Templates"
          value={mockTemplates.length}
          icon={Layers}
          accent="violet"
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="mytasks">
        <TabsList>
          <TabsTrigger value="mytasks" className="gap-1.5">
            My Tasks
            {pendingCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="instances">All Instances</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* ── My Tasks Tab ── */}
        <TabsContent value="mytasks" className="mt-4">
          <div className="space-y-4">
            {/* Overdue banner */}
            {overdueCount > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue — please action immediately
                </p>
              </div>
            )}

            <SectionCard title="Tasks Requiring Your Action" description={`${pendingCount} pending`}>
              <div className="space-y-3">
                {mockMyTasks
                  .filter((t) => !dismissedTasks.has(t.id))
                  .map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-xl border-l-4 border border-border/40 bg-background p-4',
                        'sm:flex-row sm:items-center sm:justify-between',
                        processTypeBorderColor(task.process_type),
                        task.is_overdue && 'border-rose-400/30 dark:border-rose-500/20',
                      )}
                    >
                      {/* Left: process type + entity info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5">
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            processTypeBadge(task.process_type),
                          )}>
                            {task.process_type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground">{task.step_name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{task.entity_id}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground/70">{task.template_name}</p>
                        </div>
                      </div>

                      {/* Center: due date */}
                      <div className="flex items-center gap-1.5 sm:flex-col sm:items-end sm:gap-0.5">
                        <span className={cn(
                          'flex items-center gap-1 text-xs',
                          task.is_overdue
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-muted-foreground',
                        )}>
                          <Clock className="h-3 w-3" />
                          {task.is_overdue ? 'Overdue · ' : 'Due '}
                          {fmtDate(task.due_at)}
                        </span>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="border border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                          onClick={() =>
                            setDismissedTasks((prev) => new Set([...prev, task.id]))
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() =>
                            setDismissedTasks((prev) => new Set([...prev, task.id]))
                          }
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}

                {mockMyTasks.filter((t) => !dismissedTasks.has(t.id)).length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium text-foreground">All caught up!</p>
                    <p className="text-xs text-muted-foreground">No tasks require your action right now</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── All Instances Tab ── */}
        <TabsContent value="instances" className="mt-4">
          <SectionCard
            title="All Workflow Instances"
            description={`${mockInstances.length} total instances`}
            padded={false}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockInstances.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        processTypeBadge(inst.process_type),
                      )}>
                        {inst.process_type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[13px] font-bold text-foreground">{inst.entity_id}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inst.template_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-xs font-medium text-foreground">
                          {inst.current_step} / {inst.total_steps}
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/60">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              inst.status === 'COMPLETED' ? 'bg-emerald-500'
                              : inst.status === 'REJECTED' ? 'bg-rose-500'
                              : 'bg-blue-500',
                            )}
                            style={{ width: `${(inst.current_step / inst.total_steps) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(inst.started_at)}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        statusBadge(inst.status),
                      )}>
                        {inst.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="mt-4">
          <div className="space-y-4">
            {mockTemplates.map((tmpl) => (
              <SectionCard
                key={tmpl.id}
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{tmpl.name}</span>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      processTypeBadge(tmpl.process_type),
                    )}>
                      {tmpl.process_type.replace('_', ' ')}
                    </span>
                    {tmpl.is_default && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                        Default
                      </span>
                    )}
                    {tmpl.is_active && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Active
                      </span>
                    )}
                  </div>
                }
                description={`${tmpl.steps.length} steps`}
                action={
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    Edit <ChevronRight className="h-3 w-3" />
                  </Button>
                }
              >
                {/* Horizontal step flow */}
                <div className="flex flex-wrap items-center gap-2">
                  {tmpl.steps.map((step, idx) => (
                    <div key={step.step_order} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1.5">
                        {/* Step circle */}
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                          step.step_type === 'APPROVAL' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                          : step.step_type === 'REVIEW'  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : step.step_type === 'TASK'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
                        )}>
                          {step.step_order}
                        </div>
                        {/* Step label */}
                        <div className="text-center">
                          <p className="text-[11px] font-medium text-foreground leading-tight max-w-[80px]">
                            {step.name}
                          </p>
                          <span className={cn(
                            'mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                            stepTypeBadge(step.step_type),
                          )}>
                            {step.step_type}
                          </span>
                          {step.assigned_role && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground/70">{step.assigned_role}</p>
                          )}
                        </div>
                      </div>
                      {/* Arrow connector */}
                      {idx < tmpl.steps.length - 1 && (
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 mb-6" />
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
