// Things Ask Vaultex can do without the model: suggested questions that fit
// today's books, and a plain briefing used when the AI is not switched on.
import { fmtUSD } from '@/lib/data/money';
import type { snapshotNow } from './runTool';

type Snapshot = ReturnType<typeof snapshotNow>;
type Tr = (en: string, ar: string) => string;

export interface Suggestion {
  icon: 'brief' | 'approve' | 'match' | 'profit' | 'clients' | 'risk' | 'draft' | 'page' | 'partners' | 'close';
  text: string;
}

export function suggestionsFor(s: Snapshot, tr: Tr, pageName: string, firstClient?: string): Suggestion[] {
  const out: Suggestion[] = [{ icon: 'brief', text: tr('Brief me on today. What needs me first?', 'لخّص لي اليوم. ما الذي يحتاجني أولًا؟') }];
  if (s.money_requests.needs_ok > 0) {
    const n = s.money_requests.needs_ok;
    out.push({ icon: 'approve', text: tr(
      n === 1 ? '1 request needs an OK. Is it safe to approve?' : `${n} requests need an OK. Which should I check first, and why?`,
      `${s.money_requests.needs_ok} طلبات تحتاج موافقة. أيها أراجع أولًا ولماذا؟`,
    ) });
  }
  if (s.mt5_vs_books.need_a_look > 0) {
    const n = s.mt5_vs_books.need_a_look;
    out.push({ icon: 'match', text: tr(
      n === 1 ? "Why doesn't one client match MT5?" : `Why don't ${n} clients match MT5?`,
      `لماذا لا يتطابق ${s.mt5_vs_books.need_a_look} من الزبائن مع MT5؟`,
    ) });
  }
  out.push({ icon: 'profit', text: tr('How did we do this month compared to last month? Show a chart.', 'كيف كان أداؤنا هذا الشهر مقارنة بالشهر الماضي؟ اعرض رسمًا.') });
  out.push({ icon: 'clients', text: tr('Who are our 5 biggest clients, and is anything wrong with them?', 'من هم أكبر 5 زبائن لدينا، وهل هناك مشكلة مع أحدهم؟') });
  out.push({ icon: 'risk', text: tr('How much could we lose on open trades right now?', 'كم يمكن أن نخسر في الصفقات المفتوحة الآن؟') });
  if (!s.day_close.can_close_today) {
    out.push({ icon: 'close', text: tr('What stops me from closing the day?', 'ما الذي يمنعني من إغلاق اليوم؟') });
  } else {
    out.push({ icon: 'partners', text: tr('Which partner brought the most trading this month?', 'أي شريك جلب أكثر تداول هذا الشهر؟') });
  }
  if (firstClient) {
    out.push({ icon: 'draft', text: tr(`Draft a $500 deposit for ${firstClient} into the main bank.`, `جهّز طلب إيداع بقيمة 500$ لـ ${firstClient} في البنك الرئيسي.`) });
  }
  if (pageName && pageName !== 'Home') {
    out.push({ icon: 'page', text: tr(`Explain the "${pageName}" page in simple words, using our numbers.`, `اشرح صفحة "${pageName}" بكلمات بسيطة، باستخدام أرقامنا.`) });
  }
  return out.slice(0, 6);
}

/** A short briefing written from the numbers, used when the AI cannot be reached. */
export function localBriefing(s: Snapshot, tr: Tr): string {
  const lines: string[] = [];
  lines.push(tr(
    `**${s.company} today.** You have **${fmtUSD(s.money_on_hand_cash_and_banks)}** in cash and banks. Clients keep **${fmtUSD(s.clients_money_with_us)}** with you.`,
    `**${s.company} اليوم.** لديك **${fmtUSD(s.money_on_hand_cash_and_banks)}** في الصناديق والبنوك. ويحفظ الزبائن **${fmtUSD(s.clients_money_with_us)}** لديك.`,
  ));
  const p = s.profit_this_month;
  lines.push(tr(
    `This month you earned ${fmtUSD(p.income)} and spent ${fmtUSD(p.costs)}, so profit is **${fmtUSD(p.profit)}** (last month: ${fmtUSD(s.profit_last_month.profit)}).`,
    `هذا الشهر كسبت ${fmtUSD(p.income)} وصرفت ${fmtUSD(p.costs)}، فالربح **${fmtUSD(p.profit)}** (الشهر الماضي: ${fmtUSD(s.profit_last_month.profit)}).`,
  ));
  const todo: string[] = [];
  const r = s.money_requests;
  const one = (n: number, en1: string, enN: string, ar: string) => tr(n === 1 ? en1 : enN, ar);
  if (r.needs_ok) todo.push(one(r.needs_ok, '1 money request needs an OK.', `${r.needs_ok} money requests need an OK.`, `${r.needs_ok} من طلبات المال تحتاج موافقة.`));
  if (r.ok_given_send_money) todo.push(one(r.ok_given_send_money, '1 request has an OK. Send the money.', `${r.ok_given_send_money} requests have an OK. Send the money.`, `${r.ok_given_send_money} تمت الموافقة عليها. أرسل المال.`));
  if (r.money_sent_write_in_books) todo.push(one(r.money_sent_write_in_books, '1 request was sent. Write it in the books.', `${r.money_sent_write_in_books} requests were sent. Write them in the books.`, `${r.money_sent_write_in_books} أُرسلت. سجّلها في الدفاتر.`));
  const gap = s.mt5_vs_books.need_a_look;
  if (gap) todo.push(one(gap, `1 client does not match MT5 (${fmtUSD(s.mt5_vs_books.unexplained_total)} with no reason yet).`, `${gap} clients do not match MT5 (${fmtUSD(s.mt5_vs_books.unexplained_total)} with no reason yet).`, `${gap} زبائن لا يتطابقون مع MT5 (${fmtUSD(s.mt5_vs_books.unexplained_total)} بلا سبب بعد).`));
  const stuck = s.day_close.blocking_requests;
  if (!s.day_close.can_close_today) todo.push(one(stuck, 'The day cannot close yet: 1 request is half done.', `The day cannot close yet: ${stuck} requests are half done.`, `لا يمكن إغلاق اليوم بعد: ${stuck} طلبات لم تكتمل.`));
  if (todo.length) {
    lines.push(tr('**What needs you:**', '**ما يحتاجك:**'));
    lines.push(todo.map((t) => `- ${t}`).join('\n'));
  } else {
    lines.push(tr('Nothing is waiting for you. All good.', 'لا شيء ينتظرك. كل شيء جيد.'));
  }
  return lines.join('\n\n');
}
