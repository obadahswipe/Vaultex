import { useBooks } from '@/stores/books.store';
import { useActingUser } from '@/lib/data/hooks';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { attempt } from '@/components/shared/form';
import { canConfirmRequest, canCreateVoucher, canExecuteRequest } from '@/lib/roles';
import type { OperationRequest } from '@/lib/data/types';

export interface NextStep {
  label: string;
  run: () => boolean;
  allowed: boolean;
  why?: string; // why the current person cannot do it
}

/** The one next thing to do with a request, and whether the current person may do it. */
export function useRequestActions() {
  const { tr } = useTranslation();
  const me = useActingUser();
  const ops = useBooks((s) => s.ops);
  const confirmRequest = useBooks((s) => s.confirmRequest);
  const executeRequest = useBooks((s) => s.executeRequest);
  const createVoucher = useBooks((s) => s.createVoucher);
  const rejectRequest = useBooks((s) => s.rejectRequest);

  const nextStep = (r: OperationRequest): NextStep | null => {
    if (r.status === 'pending') {
      const sameMaker = ops.requireDifferentConfirmer && r.createdBy === me.email;
      const roleOk = canConfirmRequest(me.role);
      return {
        label: tr('Say OK', 'وافق'),
        allowed: roleOk && !sameMaker,
        why: !roleOk
          ? tr('Only a manager can say OK.', 'المدير فقط يستطيع الموافقة.')
          : sameMaker ? tr('You made this request. Someone else must say OK. (Switch person at the top right.)', 'أنت من أنشأ الطلب. يجب أن يوافق شخص آخر. (بدّل الشخص من أعلى الصفحة.)') : undefined,
        run: () => attempt(() => confirmRequest(r.id, me.email), tr(`You said OK to request #${r.requestNo}`, `وافقت على الطلب رقم ${r.requestNo}`)),
      };
    }
    if (r.status === 'confirmed') {
      const roleOk = canExecuteRequest(me.role);
      return {
        label: tr('Money is sent', 'تم إرسال المال'),
        allowed: roleOk,
        why: roleOk ? undefined : tr('Only a cashier or a manager can send money.', 'أمين الصندوق أو المدير فقط يستطيع إرسال المال.'),
        run: () => attempt(() => executeRequest(r.id, me.email), tr(`Request #${r.requestNo}: money sent`, `الطلب رقم ${r.requestNo}: أُرسل المال`)),
      };
    }
    if (r.status === 'executed') {
      const roleOk = canCreateVoucher(me.role);
      return {
        label: tr('Write in the books', 'سجّل في الدفاتر'),
        allowed: roleOk,
        why: roleOk ? undefined : tr('Only an accountant or a manager can write in the books.', 'المحاسب أو المدير فقط يستطيع التسجيل في الدفاتر.'),
        run: () => attempt(() => { createVoucher(r.id, me.email); }, tr(`Request #${r.requestNo} is done and in the books`, `الطلب رقم ${r.requestNo} مكتمل ومسجّل في الدفاتر`)),
      };
    }
    return null;
  };

  const canReject = (r: OperationRequest) =>
    (r.status === 'pending' || r.status === 'confirmed') && canConfirmRequest(me.role);

  const reject = (r: OperationRequest, note?: string) =>
    attempt(() => rejectRequest(r.id, me.email, note), tr(`You said no to request #${r.requestNo}`, `رفضت الطلب رقم ${r.requestNo}`));

  return { nextStep, canReject, reject, me };
}
