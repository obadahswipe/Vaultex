import { useState } from 'react';
import { Plus, Users, Wallet, CalendarDays, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Segmented, Toggle, attempt } from '@/components/shared/form';
import { AccountPicker } from '@/components/shared/AccountPicker';
import { useBooks } from '@/stores/books.store';
import { useActingUser, useLedger } from '@/lib/data/hooks';
import { fmtUSD } from '@/lib/data/money';
import { isAdmin } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

type Tab = 'team' | 'leave' | 'pay';

export default function HR() {
  const { tr, nameOf } = useTranslation();
  const me = useActingUser();
  const employees = useBooks((s) => s.employees);
  const branches = useBooks((s) => s.branches);
  const leaves = useBooks((s) => s.leaves);
  const payrolls = useBooks((s) => s.payrolls);
  const addEmployee = useBooks((s) => s.addEmployee);
  const updateEmployee = useBooks((s) => s.updateEmployee);
  const addLeave = useBooks((s) => s.addLeave);
  const setLeaveStatus = useBooks((s) => s.setLeaveStatus);
  const runPayroll = useBooks((s) => s.runPayroll);
  const { balances } = useLedger();
  const [tab, setTab] = useState<Tab>('team');
  const [addOpen, setAddOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [f, setF] = useState({ name: '', arabic: '', role: '', branchId: 'br-1', salary: '' });
  const [lv, setLv] = useState({ employeeId: '', from: '', to: '', reason: '' });
  const [payFrom, setPayFrom] = useState('1201');

  const active = employees.filter((e) => e.active);
  const monthly = active.reduce((s, e) => s + e.salary, 0);
  const month = new Date().toISOString().slice(0, 7);
  const paidThisMonth = payrolls.some((p) => p.month === month);
  const branchName = (id: string) => { const b = branches.find((x) => x.id === id); return b ? nameOf({ name: b.name, arabic: b.arabic }) : '—'; };
  const empName = (id: string) => nameOf(employees.find((e) => e.id === id));

  const saveEmployee = () => {
    const ok = attempt(() => addEmployee({ name: f.name.trim(), arabic: f.arabic.trim() || undefined, role: f.role || tr('Staff', 'موظف'), branchId: f.branchId, salary: Number(f.salary) || 0, joinDate: new Date().toISOString().slice(0, 10), active: true, leaveDaysLeft: 14 }), tr('Added to the team', 'أُضيف إلى الفريق'));
    if (ok) { setAddOpen(false); setF({ name: '', arabic: '', role: '', branchId: 'br-1', salary: '' }); }
  };
  const saveLeave = () => {
    const ok = attempt(() => addLeave(lv), tr('Day-off request saved', 'تم حفظ طلب الإجازة'));
    if (ok) { setLeaveOpen(false); setLv({ employeeId: '', from: '', to: '', reason: '' }); }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Team and salaries', 'الفريق والرواتب')}
        subtitle={tr('Your staff, their days off, and paying salaries.', 'موظفوك، وإجازاتهم، ودفع الرواتب.')}
        hint={
          <PageHint id="hr-v2" title={tr('Paying salaries', 'دفع الرواتب')}>
            {tr('Press "Pay salaries" once a month. Vaultex adds up every active person’s salary and writes it in the books for you.', 'اضغط "ادفع الرواتب" مرة في الشهر. فولتكس يجمع راتب كل موظف نشط ويسجّله في الدفاتر عنك.')}
          </PageHint>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setLeaveOpen(true)}><CalendarDays className="h-4 w-4" />{tr('Ask for days off', 'اطلب إجازة')}</Button>
            <Button variant="gradient" className="gap-1.5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />{tr('Add a person', 'أضف موظفًا')}</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={tr('People working', 'الموظفون العاملون')} value={active.length} icon={Users} accent="blue" deltaLabel={tr(`In ${branches.length} branches`, `في ${branches.length} فروع`)} />
        <StatCard label={tr('Salaries each month', 'الرواتب الشهرية')} value={fmtUSD(monthly)} icon={Wallet} accent="violet" deltaLabel={paidThisMonth ? tr('Paid for this month ✓', 'دُفعت لهذا الشهر ✓') : tr('Not paid for this month yet', 'لم تُدفع لهذا الشهر بعد')} />
        <StatCard label={tr('Days-off requests', 'طلبات الإجازة')} value={leaves.filter((l) => l.status === 'pending').length} icon={CalendarDays} accent="amber" deltaLabel={tr('Waiting for an answer', 'تنتظر الرد')} onClick={() => setTab('leave')} />
      </div>

      <Segmented<Tab> value={tab} onChange={setTab} options={[
        { value: 'team', label: tr('Team', 'الفريق') },
        { value: 'leave', label: tr('Days off', 'الإجازات'), count: leaves.filter((l) => l.status === 'pending').length },
        { value: 'pay', label: tr('Salaries', 'الرواتب') },
      ]} />

      {tab === 'team' && (
        <SectionCard padded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('Name', 'الاسم')}</TableHead>
                <TableHead className="hidden sm:table-cell">{tr('Job', 'الوظيفة')}</TableHead>
                <TableHead className="hidden md:table-cell">{tr('Branch', 'الفرع')}</TableHead>
                <TableHead className="text-end">{tr('Salary', 'الراتب')}</TableHead>
                <TableHead className="hidden text-end lg:table-cell">{tr('Loan', 'السلفة')}</TableHead>
                <TableHead className="hidden text-end md:table-cell">{tr('Days off left', 'أيام الإجازة المتبقية')}</TableHead>
                <TableHead className="text-center">{tr('Working', 'يعمل')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id} className={cn(!e.active && 'opacity-50')}>
                  <TableCell className="font-medium">{nameOf(e)}</TableCell>
                  <TableCell className="hidden text-[13px] sm:table-cell">{e.role}</TableCell>
                  <TableCell className="hidden text-[13px] md:table-cell">{branchName(e.branchId)}</TableCell>
                  <TableCell className="text-end font-mono">{fmtUSD(e.salary)}</TableCell>
                  <TableCell className="hidden text-end font-mono lg:table-cell">{e.loanAccountCode ? fmtUSD(balances[e.loanAccountCode] ?? 0) : '—'}</TableCell>
                  <TableCell className="hidden text-end md:table-cell">{e.leaveDaysLeft}</TableCell>
                  <TableCell className="text-center"><Toggle checked={e.active} onChange={(v) => updateEmployee(e.id, { active: v })} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {tab === 'leave' && (
        <SectionCard padded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('Who', 'من')}</TableHead>
                <TableHead>{tr('From – to', 'من – إلى')}</TableHead>
                <TableHead className="hidden sm:table-cell">{tr('Why', 'السبب')}</TableHead>
                <TableHead>{tr('Answer', 'الرد')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{empName(l.employeeId)}</TableCell>
                  <TableCell className="text-[13px]">{l.from} → {l.to}</TableCell>
                  <TableCell className="hidden text-[13px] sm:table-cell">{l.reason}</TableCell>
                  <TableCell>
                    {l.status === 'pending' ? (
                      isAdmin(me.role) ? (
                        <div className="flex gap-1">
                          <Button size="xs" variant="outline" className="gap-1 text-success" onClick={() => setLeaveStatus(l.id, 'approved')}><Check className="h-3 w-3" />{tr('Yes', 'نعم')}</Button>
                          <Button size="xs" variant="outline" className="gap-1 text-destructive" onClick={() => setLeaveStatus(l.id, 'rejected')}><X className="h-3 w-3" />{tr('No', 'لا')}</Button>
                        </div>
                      ) : <Badge variant="warning">{tr('Waiting', 'ينتظر')}</Badge>
                    ) : l.status === 'approved' ? <Badge variant="success">{tr('Yes', 'موافق')}</Badge> : <Badge variant="destructive">{tr('No', 'مرفوض')}</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {tab === 'pay' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title={tr(`Pay salaries for ${month}`, `ادفع رواتب ${month}`)}>
            <div className="space-y-4">
              <p className="text-[14px]">{tr(`${active.length} people · ${fmtUSD(monthly)} in total`, `${active.length} موظفين · ${fmtUSD(monthly)} بالمجموع`)}</p>
              <Field label={tr('Pay from', 'ادفع من')}>
                <AccountPicker value={payFrom} onChange={setPayFrom} categories={['banks', 'funds']} />
              </Field>
              <Button variant="gradient" className="w-full" disabled={paidThisMonth || !payFrom || !isAdmin(me.role)} onClick={() => attempt(() => runPayroll(month, payFrom, me.email), tr('Salaries paid and written in the books', 'دُفعت الرواتب وسُجّلت في الدفاتر'))}>
                {paidThisMonth ? tr('Already paid this month ✓', 'دُفعت هذا الشهر ✓') : tr('Pay salaries', 'ادفع الرواتب')}
              </Button>
              {!isAdmin(me.role) && <p className="text-[12px] text-muted-foreground">{tr('Only a manager can pay salaries.', 'المدير فقط يستطيع دفع الرواتب.')}</p>}
            </div>
          </SectionCard>
          <SectionCard className="lg:col-span-2" padded={false} title={tr('Salaries paid before', 'رواتب دُفعت سابقًا')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr('Month', 'الشهر')}</TableHead>
                  <TableHead className="text-end">{tr('Total', 'المجموع')}</TableHead>
                  <TableHead>{tr('Paid on', 'دُفعت في')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.slice().reverse().map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.month}</TableCell>
                    <TableCell className="text-end font-mono">{fmtUSD(p.total)}</TableCell>
                    <TableCell className="text-[13px]">{p.createdAt.slice(0, 10)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Add a person', 'أضف موظفًا')}</DialogTitle>
            <DialogDescription>{tr('They will be added to next month’s salaries.', 'سيُضاف إلى رواتب الشهر القادم.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={f.arabic} onChange={(e) => setF({ ...f, arabic: e.target.value })} /></Field>
            <Field label={tr('Job', 'الوظيفة')}><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
            <Field label={tr('Salary each month (USD)', 'الراتب الشهري (دولار)')}><Input type="number" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} /></Field>
            <Field label={tr('Branch', 'الفرع')} className="sm:col-span-2">
              <NativeSelect value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
                {branches.map((b) => <option key={b.id} value={b.id}>{nameOf({ name: b.name, arabic: b.arabic })}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!f.name.trim()} onClick={saveEmployee}>{tr('Add', 'أضف')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Ask for days off', 'اطلب إجازة')}</DialogTitle>
            <DialogDescription>{tr('A manager will say yes or no.', 'سيرد المدير بنعم أو لا.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Who', 'من')} className="sm:col-span-2">
              <NativeSelect value={lv.employeeId} onChange={(e) => setLv({ ...lv, employeeId: e.target.value })}>
                <option value="">{tr('Choose…', 'اختر…')}</option>
                {active.map((e) => <option key={e.id} value={e.id}>{nameOf(e)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('From', 'من')}><Input type="date" value={lv.from} onChange={(e) => setLv({ ...lv, from: e.target.value })} /></Field>
            <Field label={tr('To', 'إلى')}><Input type="date" value={lv.to} onChange={(e) => setLv({ ...lv, to: e.target.value })} /></Field>
            <Field label={tr('Why', 'السبب')} className="sm:col-span-2"><Input value={lv.reason} onChange={(e) => setLv({ ...lv, reason: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!lv.employeeId || !lv.from || !lv.to || lv.to < lv.from} onClick={saveLeave}>{tr('Send', 'أرسل')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
