// Ask Vaultex through OpenRouter. The browser speaks one message shape (text,
// tool_use and tool_result blocks); this file turns it into OpenRouter's chat
// format, streams the reply, and turns it back, so the app does not change.
import type Anthropic from '@anthropic-ai/sdk';

type Block = { type: string; [k: string]: unknown };
type Msg = { role: 'user' | 'assistant'; content: string | Block[] };
type Send = (event: unknown) => void;

type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string };

const URL = 'https://openrouter.ai/api/v1/chat/completions';

function toChat(system: string, messages: Msg[]): ChatMessage[] {
  const out: ChatMessage[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    const blocks: Block[] = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    if (m.role === 'assistant') {
      const text = blocks.filter((b) => b.type === 'text').map((b) => String(b.text ?? '')).join('');
      const calls = blocks.filter((b) => b.type === 'tool_use').map((b) => ({
        id: String(b.id), type: 'function' as const,
        function: { name: String(b.name), arguments: JSON.stringify(b.input ?? {}) },
      }));
      out.push({ role: 'assistant', content: text || (calls.length ? null : ''), ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      for (const b of blocks) {
        if (b.type === 'tool_result') {
          out.push({ role: 'tool', tool_call_id: String(b.tool_use_id), content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content) });
        }
      }
      const text = blocks.filter((b) => b.type === 'text').map((b) => String(b.text ?? '')).join('\n');
      if (text) out.push({ role: 'user', content: text });
    }
  }
  return out;
}

function toTools(tools: Anthropic.Beta.BetaTool[]) {
  return tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
}

export async function streamOpenRouter(opts: {
  key: string;
  model: string;
  system: string;
  tools: Anthropic.Beta.BetaTool[];
  messages: Msg[];
  signal: AbortSignal;
  send: Send;
  referer?: string;
}) {
  const { send } = opts;
  const res = await fetch(URL, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      authorization: `Bearer ${opts.key}`,
      'content-type': 'application/json',
      'x-title': 'Vaultex',
      ...(opts.referer ? { 'http-referer': opts.referer } : {}),
    },
    body: JSON.stringify({
      model: opts.model,
      stream: true,
      max_tokens: 4000,
      messages: toChat(opts.system, opts.messages),
      tools: toTools(opts.tools),
      tool_choice: 'auto',
    }),
  });

  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    if (res.status === 401 || res.status === 403) send({ t: 'error', code: 'not_configured' });
    else if (res.status === 429) send({ t: 'error', code: 'busy' });
    else if (res.status === 402) send({ t: 'error', code: 'busy', message: 'no_credit' });
    else send({ t: 'error', code: 'upstream', message: `${res.status} ${detail}` });
    return;
  }

  let text = '';
  let finish = '';
  const calls: { id: string; name: string; args: string }[] = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // keep-alive comments
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      let chunk: {
        error?: { message?: string; code?: number };
        choices?: { delta?: { content?: string | null; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[];
      };
      try { chunk = JSON.parse(data); } catch { continue; }
      if (chunk.error) {
        send({ t: 'error', code: chunk.error.code === 429 ? 'busy' : 'upstream', message: chunk.error.message });
        return;
      }
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};
      if (delta.content) {
        text += delta.content;
        send({ t: 'text', d: delta.content });
      }
      for (const tc of delta.tool_calls ?? []) {
        const i = tc.index ?? calls.length;
        if (!calls[i]) calls[i] = { id: tc.id ?? `call_${i}_${Date.now().toString(36)}`, name: '', args: '' };
        if (tc.id) calls[i].id = tc.id;
        if (tc.function?.name) {
          if (!calls[i].name) send({ t: 'tool', name: tc.function.name });
          calls[i].name += tc.function.name;
        }
        if (tc.function?.arguments) calls[i].args += tc.function.arguments;
      }
      if (choice.finish_reason) finish = choice.finish_reason;
    }
  }

  const content: Block[] = [];
  if (text) content.push({ type: 'text', text });
  for (const c of calls.filter(Boolean)) {
    if (!c.name) continue;
    let input: unknown = {};
    try { input = c.args.trim() ? JSON.parse(c.args) : {}; } catch { input = {}; }
    content.push({ type: 'tool_use', id: c.id, name: c.name, input });
  }
  const hasTools = content.some((b) => b.type === 'tool_use');
  const stop = hasTools ? 'tool_use' : finish === 'length' ? 'max_tokens' : 'end_turn';
  send({ t: 'done', content: content.length ? content : [{ type: 'text', text: '' }], stop });
}
