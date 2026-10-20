// The Ask Vaultex conversation. The browser keeps the history, runs the tools
// against its own books, and asks /api/ask for one model turn at a time.
import { create } from 'zustand';
import { runTool, type Attachment } from './runTool';

export type AskError = 'not_configured' | 'busy' | 'offline' | 'refused' | 'failed' | 'too_long';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tools: string[];
  attachments: (Attachment & { createdNo?: number })[];
  streaming?: boolean;
  error?: AskError;
}

// Anthropic message shapes, kept loose here: the browser only appends what the
// server sent back, unchanged, so thinking blocks stay valid.
type ApiBlock = { type: string; [k: string]: unknown };
type ApiMessage = { role: 'user' | 'assistant'; content: ApiBlock[] };

export interface AskContext {
  page: string;
  pageName: string;
  userName: string;
  userRole: string;
  lang: 'en' | 'ar';
}

interface ChatState {
  open: boolean;
  messages: UiMessage[];
  busy: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  ask: (text: string, ctx: AskContext) => Promise<void>;
  stop: () => void;
  reset: () => void;
  markCreated: (messageId: string, index: number, requestNo: number) => void;
}

const MAX_STEPS = 8;
const uid = () => Math.random().toString(36).slice(2, 10);

let history: ApiMessage[] = [];
let controller: AbortController | null = null;

function contextBlock(ctx: AskContext) {
  const now = new Date();
  return `<context>
today: ${now.toISOString().slice(0, 10)} (${now.toLocaleDateString('en-GB', { weekday: 'long' })}), local time ${now.toTimeString().slice(0, 5)}
page: ${ctx.pageName} (${ctx.page})
person: ${ctx.userName}, role ${ctx.userRole}
app language: ${ctx.lang === 'ar' ? 'Arabic' : 'English'}
</context>`;
}

async function oneTurn(
  messages: ApiMessage[],
  signal: AbortSignal,
  onText: (t: string) => void,
  onTool: (name: string) => void,
): Promise<{ content: ApiBlock[]; stop: string } | { error: AskError }> {
  let res: Response;
  try {
    res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    return { error: 'offline' };
  }
  if (!res.ok || !res.body) {
    if (res.status === 503 || res.status === 404) return { error: 'not_configured' };
    if (res.status === 429) return { error: 'busy' };
    if (res.status === 413) return { error: 'too_long' };
    return { error: 'failed' };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done: { content: ApiBlock[]; stop: string } | null = null;
  let error: AskError | null = null;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let ev: { t: string; d?: string; name?: string; content?: ApiBlock[]; stop?: string; code?: string };
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.t === 'text' && ev.d) onText(ev.d);
      else if (ev.t === 'tool' && ev.name) onTool(ev.name);
      else if (ev.t === 'done' && ev.content) done = { content: ev.content, stop: ev.stop ?? 'end_turn' };
      else if (ev.t === 'error') error = ev.code === 'not_configured' ? 'not_configured' : ev.code === 'busy' ? 'busy' : 'failed';
    }
  }
  if (done) return done;
  return { error: error ?? 'failed' };
}

export const useAskVaultex = create<ChatState>()((set, get) => {
  const patchLast = (fn: (m: UiMessage) => UiMessage) =>
    set((s) => {
      const msgs = [...s.messages];
      const i = msgs.length - 1;
      if (i >= 0 && msgs[i].role === 'assistant') msgs[i] = fn(msgs[i]);
      return { messages: msgs };
    });

  return {
    open: false,
    messages: [],
    busy: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((s) => ({ open: !s.open })),

    reset: () => {
      controller?.abort();
      history = [];
      set({ messages: [], busy: false });
    },

    stop: () => {
      controller?.abort();
    },

    markCreated: (messageId, index, requestNo) =>
      set((s) => ({
        messages: s.messages.map((m) => m.id !== messageId ? m : {
          ...m, attachments: m.attachments.map((a, i) => (i === index ? { ...a, createdNo: requestNo } : a)),
        }),
      })),

    ask: async (text, ctx) => {
      const question = text.trim();
      if (!question || get().busy) return;
      controller = new AbortController();
      const signal = controller.signal;
      set((s) => ({
        busy: true,
        messages: [
          ...s.messages,
          { id: uid(), role: 'user', text: question, tools: [], attachments: [] },
          { id: uid(), role: 'assistant', text: '', tools: [], attachments: [], streaming: true },
        ],
      }));
      // Work on a copy, and keep it only if the turn finishes cleanly.
      const working: ApiMessage[] = [...history, { role: 'user', content: [{ type: 'text', text: `${contextBlock(ctx)}\n\n${question}` }] }];

      try {
        for (let step = 0; step < MAX_STEPS; step++) {
          let gap = step > 0;
          const out = await oneTurn(
            working, signal,
            (t) => patchLast((m) => {
              const sep = gap && m.text && !m.text.endsWith('\n') ? '\n\n' : '';
              gap = false;
              return { ...m, text: m.text + sep + t };
            }),
            (name) => patchLast((m) => (m.tools.includes(name) ? m : { ...m, tools: [...m.tools, name] })),
          );
          if ('error' in out) {
            patchLast((m) => ({ ...m, streaming: false, error: out.error }));
            break;
          }
          working.push({ role: 'assistant', content: out.content });
          if (out.stop === 'refusal') {
            patchLast((m) => ({ ...m, streaming: false, error: 'refused' }));
            break;
          }
          const calls = out.content.filter((b) => b.type === 'tool_use') as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }[];
          if (out.stop !== 'tool_use' || calls.length === 0) {
            history = working;
            patchLast((m) => ({ ...m, streaming: false }));
            break;
          }
          const results: ApiBlock[] = [];
          for (const call of calls) {
            const outcome = runTool(call.name, call.input ?? {});
            if (outcome.attachment) {
              const att = outcome.attachment;
              patchLast((m) => ({ ...m, attachments: [...m.attachments, att] }));
            }
            results.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: JSON.stringify(outcome.result),
              ...(outcome.isError ? { is_error: true } : {}),
            });
          }
          working.push({ role: 'user', content: results });
          if (step === MAX_STEPS - 1) {
            history = working;
            patchLast((m) => ({ ...m, streaming: false }));
          }
        }
      } catch {
        // Stopped by the person. Keep what was shown; drop the half-finished turn.
        patchLast((m) => ({ ...m, streaming: false }));
      } finally {
        controller = null;
        set({ busy: false });
      }
    },
  };
});
