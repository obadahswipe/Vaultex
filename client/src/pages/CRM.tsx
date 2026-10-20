import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, UserPlus, MessageSquare, Phone } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, Segmented, attempt } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Lead, Ticket } from '@/lib/data/types';

type Tab = 'leads' | 'help';
const STAGES: { key: Lead['stage']; en: string; ar: string; color: string }[] = [
  { key: 'new',     en: 'New',             ar: 'جديد',            color: 'bg-sky-500' },
  { key: 'talking', en: 'Talking',         ar: 'نتحدث معه',       color: 'bg-violet-500' },
  { key: 'docs',    en: 'Sending papers',  ar: 'يرسل الأوراق',    color: 'bg-amber-500' },
  { key: 'won',     en: 'Joined',          ar: 'انضم',            color: 'bg-emerald-500' },
  { key: 'lost',    en: 'Did not join',    ar: 'لم ينضم',         color: 'bg-slate-400' },
];
const SOURCE: Record<Lead['source'], { en: string; ar: string }> = {
  website: { en: 'Website', ar: 'الموقع' }, partner: { en: 'A partner', ar: 'شريك' }, friend: { en: 'A friend', ar: 'صديق' },
  social: { en: 'Social media', ar: 'وسائل التواصل' }, event: { en: 'An event', ar: 'فعالية' },
};

export default function CRM() {
  const { tr, nameOf } = useTranslation();
  const navigate = useNavigate();
  const leads = useBooks((s) => s.leads);
  const tickets = useBooks((s) => s.tickets);
  const clients = useBooks((s) => s.clients);
  const employees = useBooks((s) => s.employees);
  const addLead = useBooks((s) => s.addLead);
  const updateLead = useBooks((s) => s.updateLead);
  const convertLead = useBooks((s) => s.convertLead);
  const addTicket = useBooks((s) => s.addTicket);
  const updateTicket = useBooks((s) => s.updateTicket);
  const [tab, setTab] = useState<Tab>('leads');
  const [leadOpen, setLeadOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [l, setL] = useState({ name: '', phone: '', email: '', country: '', source: 'website' as Lead['source'], ownerName: employees[6]?.name ?? '', note: '' });
  const [t, setT] = useState({ clientId: '', subject: '', priority: 'normal' as Ticket['priority'] });

  const next = (stage: Lead['stage']): Lead['stage'] | null => (stage === 'new' ? 'talking' : stage === 'talking' ? 'docs' : null);

  const join = (lead: Lead) => {
    let id = '';
    if (attempt(() => { id = convertLead(lead.id)?.accountNo ?? ''; }, tr(`${lead.name} is now a client`, `${lead.name} أصبح زبونًا`)) && id) navigate(`/clients?account=${id}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('New clients and help', 'زبائن جدد ودعم')}
        subtitle={tr('People who might open an account, and questions from your clients.', 'أشخاص قد يفتحون حسابًا، وأسئلة من زبائنك.')}
        hint={<PageHint id="crm-v2" title={tr('From "new" to "joined"', 'من "جديد" إلى "انضم"')}>{tr('Move each person along with the arrow button. When their papers are OK, press "Make them a client" — Vaultex opens their account for you.', 'انقل كل شخص للأمام بزر السهم. عندما تكون أوراقه سليمة اضغط "اجعله زبونًا" — فولتكس يفتح حسابه لك.')}</PageHint>}
        actions={
          <Button variant="gradient" className="gap-1.5" onClick={() => (tab === 'leads' ? setLeadOpen(true) : setTicketOpen(true))}>
            <Plus className="h-4 w-4" />{tab === 'leads' ? tr('Add a person', 'أضف شخصًا') : tr('Add a question', 'أضف سؤالًا')}
          </Button>
        }
      />

      <Segmented<Tab> value={tab} onChange={setTab} options={[
        { value: 'leads', label: tr('People who might join', 'أشخاص قد ينضمون'), count: leads.filter((x) => x.stage !== 'won' && x.stage !== 'lost').length },
        { value: 'help', label: tr('Client questions', 'أسئلة الزبائن'), count: tickets.filter((x) => x.status !== 'closed').length },
      ]} />

      {tab === 'leads' && (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {STAGES.map((st) => {
            const list = leads.filter((x) => x.stage === st.key);
            return (
              <div key={st.key} className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                <p className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold">
                  <span className={cn('h-2.5 w-2.5 rounded-full', st.color)} />{tr(st.en, st.ar)}
                  <span className="ms-auto rounded-full bg-card px-2 text-[11px]">{list.length}</span>
                </p>
                <div className="space-y-2">
                  {list.map((lead) => {
                    const n = next(lead.stage);
                    return (
                      <div key={lead.id} className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                        <p className="text-[14px] font-semibold">{lead.name}</p>
                        <p className="text-[11px] text-muted-foreground">{lead.country} · {tr(SOURCE[lead.source].en, SOURCE[lead.source].ar)}</p>
                        {lead.phone && <p className="mt-1 flex items-center gap-1 text-[12px]" dir="ltr"><Phone className="h-3 w-3" />{lead.phone}</p>}
                        {lead.note && <p className="mt-1 text-[12px] italic text-muted-foreground">“{lead.note}”</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground">{tr('Looked after by', 'يتابعه')} {lead.ownerName}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {n && <Button size="xs" variant="outline" className="gap-1" onClick={() => updateLead(lead.id, { stage: n })}>{tr(STAGES.find((s) => s.key === n)!.en, STAGES.find((s) => s.key === n)!.ar)}<ArrowRight className="h-3 w-3 rtl:rotate-180" /></Button>}
                          {lead.stage === 'docs' && <Button size="xs" variant="gradient" className="gap-1" onClick={() => join(lead)}><UserPlus className="h-3 w-3" />{tr('Make them a client', 'اجعله زبونًا')}</Button>}
                          {(lead.stage === 'new' || lead.stage === 'talking' || lead.stage === 'docs') && <Button size="xs" variant="ghost" onClick={() => updateLead(lead.id, { stage: 'lost' })}>{tr('Did not join', 'لم ينضم')}</Button>}
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && <p className="px-1 py-4 text-center text-[12px] text-muted-foreground">{tr('Nobody here', 'لا أحد هنا')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'help' && (
        <SectionCard padded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('Question', 'السؤال')}</TableHead>
                <TableHead className="hidden sm:table-cell">{tr('Client', 'الزبون')}</TableHead>
                <TableHead>{tr('How urgent', 'الأهمية')}</TableHead>
                <TableHead>{tr('Status', 'الحالة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((x) => (
                <TableRow key={x.id}>
                  <TableCell><p className="flex items-center gap-2 font-medium"><MessageSquare className="h-4 w-4 text-muted-foreground" />{x.subject}</p><p className="text-[11px] text-muted-foreground">{x.createdAt.slice(0, 16).replace('T', ' ')}</p></TableCell>
                  <TableCell className="hidden text-[13px] sm:table-cell">{nameOf(clients.find((c) => c.id === x.clientId))}</TableCell>
                  <TableCell>{x.priority === 'high' ? <Badge variant="destructive">{tr('High', 'عالية')}</Badge> : x.priority === 'low' ? <Badge variant="secondary">{tr('Low', 'منخفضة')}</Badge> : <Badge variant="outline">{tr('Normal', 'عادية')}</Badge>}</TableCell>
                  <TableCell>
                    <NativeSelect value={x.status} onChange={(e) => updateTicket(x.id, { status: e.target.value as Ticket['status'] })} className="h-8 w-auto">
                      <option value="open">{tr('Open', 'مفتوح')}</option>
                      <option value="waiting">{tr('Waiting for client', 'ننتظر الزبون')}</option>
                      <option value="closed">{tr('Done', 'تم')}</option>
                    </NativeSelect>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Add a person who might join', 'أضف شخصًا قد ينضم')}</DialogTitle>
            <DialogDescription>{tr('Someone who asked about opening an account.', 'شخص سأل عن فتح حساب.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Name', 'الاسم')}><Input value={l.name} onChange={(e) => setL({ ...l, name: e.target.value })} /></Field>
            <Field label={tr('Phone', 'الهاتف')}><Input value={l.phone} onChange={(e) => setL({ ...l, phone: e.target.value })} /></Field>
            <Field label={tr('Email', 'البريد')}><Input value={l.email} onChange={(e) => setL({ ...l, email: e.target.value })} /></Field>
            <Field label={tr('Country', 'البلد')}><Input value={l.country} onChange={(e) => setL({ ...l, country: e.target.value })} /></Field>
            <Field label={tr('How did they find us?', 'كيف وجدونا؟')}>
              <NativeSelect value={l.source} onChange={(e) => setL({ ...l, source: e.target.value as Lead['source'] })}>
                {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{tr(v.en, v.ar)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Who looks after them', 'من يتابعه')}>
              <NativeSelect value={l.ownerName} onChange={(e) => setL({ ...l, ownerName: e.target.value })}>
                {employees.filter((e) => e.active).map((e) => <option key={e.id} value={e.name}>{nameOf(e)}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLeadOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!l.name.trim()} onClick={() => { if (attempt(() => addLead({ ...l, name: l.name.trim(), stage: 'new', phone: l.phone || undefined, email: l.email || undefined, note: l.note || undefined }), tr('Added', 'تمت الإضافة'))) { setLeadOpen(false); setL({ ...l, name: '', phone: '', email: '', country: '' }); } }}>{tr('Add', 'أضف')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Add a client question', 'أضف سؤال زبون')}</DialogTitle>
            <DialogDescription>{tr('Write down a question so nobody forgets to answer it.', 'اكتب السؤال حتى لا ينسى أحد الرد عليه.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label={tr('Client', 'الزبون')}>
              <NativeSelect value={t.clientId} onChange={(e) => setT({ ...t, clientId: e.target.value })}>
                <option value="">{tr('Choose…', 'اختر…')}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{nameOf(c)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('The question', 'السؤال')}><Input value={t.subject} onChange={(e) => setT({ ...t, subject: e.target.value })} /></Field>
            <Field label={tr('How urgent', 'الأهمية')}>
              <NativeSelect value={t.priority} onChange={(e) => setT({ ...t, priority: e.target.value as Ticket['priority'] })}>
                <option value="low">{tr('Low', 'منخفضة')}</option>
                <option value="normal">{tr('Normal', 'عادية')}</option>
                <option value="high">{tr('High', 'عالية')}</option>
              </NativeSelect>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTicketOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!t.subject.trim()} onClick={() => { if (attempt(() => addTicket({ clientId: t.clientId || undefined, subject: t.subject.trim(), priority: t.priority, status: 'open' }), tr('Added', 'تمت الإضافة'))) { setTicketOpen(false); setT({ clientId: '', subject: '', priority: 'normal' }); } }}>{tr('Add', 'أضف')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
