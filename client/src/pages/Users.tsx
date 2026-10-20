import { useState } from 'react';
import { Plus, UserCog, Info } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Toggle, attempt } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useActingUser } from '@/lib/data/hooks';
import { ROLE_LABELS, isAdmin } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { StaffUser } from '@/lib/data/types';

export default function Users() {
  const { tr, nameOf } = useTranslation();
  const me = useActingUser();
  const users = useBooks((s) => s.users);
  const branches = useBooks((s) => s.branches);
  const addUser = useBooks((s) => s.addUser);
  const updateUser = useBooks((s) => s.updateUser);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', role: 'operations_staff' as StaffUser['role'], branchId: 'br-1' });
  const canEdit = isAdmin(me.role);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Staff logins', 'حسابات الموظفين')}
        subtitle={tr('Who can sign in, and what each person is allowed to do.', 'من يستطيع الدخول، وماذا يُسمح لكل شخص أن يفعل.')}
        hint={<PageHint id="users-v2" title={tr('Give people only what they need', 'أعطِ كل شخص ما يحتاجه فقط')}>{tr('A cashier does not need to see salaries. A viewer cannot change anything. Pick the smallest job that lets each person do their work.', 'أمين الصندوق لا يحتاج إلى رؤية الرواتب. والمشاهد لا يستطيع تغيير شيء. اختر أصغر صلاحية تكفي لعمل كل شخص.')}</PageHint>}
        actions={canEdit && <Button variant="gradient" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{tr('Add a login', 'أضف حسابًا')}</Button>}
      />

      <SectionCard title={tr('What each job can do', 'ماذا تستطيع كل وظيفة أن تفعل')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(ROLE_LABELS) as StaffUser['role'][]).map((r) => (
            <div key={r} className="rounded-xl border border-border/60 p-3">
              <p className="flex items-center gap-2 text-[14px] font-semibold"><UserCog className="h-4 w-4 text-primary" />{tr(ROLE_LABELS[r].en, ROLE_LABELS[r].ar)}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{tr(ROLE_LABELS[r].doesEn, ROLE_LABELS[r].doesAr)}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Person', 'الشخص')}</TableHead>
              <TableHead>{tr('Job', 'الوظيفة')}</TableHead>
              <TableHead className="hidden md:table-cell">{tr('Branch', 'الفرع')}</TableHead>
              <TableHead className="hidden lg:table-cell">{tr('Last seen', 'آخر ظهور')}</TableHead>
              <TableHead className="text-center">{tr('Can sign in', 'يستطيع الدخول')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const b = branches.find((x) => x.id === u.branchId);
              return (
                <TableRow key={u.id} className={cn(!u.active && 'opacity-50')}>
                  <TableCell><p className="font-medium">{u.name}{u.email === me.email && <span className="ms-2 rounded-full bg-primary/10 px-2 text-[11px] text-primary">{tr('you', 'أنت')}</span>}</p><p className="text-[12px] text-muted-foreground">{u.email}</p></TableCell>
                  <TableCell>
                    {canEdit && u.email !== me.email ? (
                      <NativeSelect value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value as StaffUser['role'] })} className="h-8 w-auto">
                        {(Object.keys(ROLE_LABELS) as StaffUser['role'][]).map((r) => <option key={r} value={r}>{tr(ROLE_LABELS[r].en, ROLE_LABELS[r].ar)}</option>)}
                      </NativeSelect>
                    ) : <span className="text-[13px]">{tr(ROLE_LABELS[u.role].en, ROLE_LABELS[u.role].ar)}</span>}
                  </TableCell>
                  <TableCell className="hidden text-[13px] md:table-cell">{b ? nameOf({ name: b.name, arabic: b.arabic }) : '—'}</TableCell>
                  <TableCell className="hidden text-[13px] text-muted-foreground lg:table-cell">{u.lastSeen ? new Date(u.lastSeen).toLocaleString('en-GB') : tr('Never', 'أبدًا')}</TableCell>
                  <TableCell className="text-center">
                    {canEdit && u.email !== me.email ? <Toggle checked={u.active} onChange={(v) => updateUser(u.id, { active: v })} /> : <span className="text-[12px] text-muted-foreground">{u.active ? tr('Yes', 'نعم') : tr('No', 'لا')}</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Add a login', 'أضف حسابًا')}</DialogTitle>
            <DialogDescription className="flex items-start gap-1.5"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tr('In the demo, every login uses the password Demo@123456.', 'في النسخة التجريبية، كل الحسابات تستخدم كلمة المرور Demo@123456.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Name', 'الاسم')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={tr('Email', 'البريد الإلكتروني')}><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label={tr('Job', 'الوظيفة')}>
              <NativeSelect value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffUser['role'] })}>
                {(Object.keys(ROLE_LABELS) as StaffUser['role'][]).map((r) => <option key={r} value={r}>{tr(ROLE_LABELS[r].en, ROLE_LABELS[r].ar)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Branch', 'الفرع')}>
              <NativeSelect value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
                {branches.map((b) => <option key={b.id} value={b.id}>{nameOf({ name: b.name, arabic: b.arabic })}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!f.name.trim() || !f.email.includes('@')} onClick={() => { if (attempt(() => addUser({ ...f, name: f.name.trim(), email: f.email.trim().toLowerCase(), active: true }), tr('Login added', 'تمت إضافة الحساب'))) { setOpen(false); setF({ name: '', email: '', role: 'operations_staff', branchId: 'br-1' }); } }}>{tr('Add', 'أضف')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
