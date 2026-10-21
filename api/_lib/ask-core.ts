// Ask Vaultex: the server half. It holds the API key, the instructions and the
// tool list, streams one model turn back to the browser, and the browser runs
// the tools against its own books and calls again. Shared by the Vercel
// function (api/ask.ts) and the Vite dev server.
import Anthropic from '@anthropic-ai/sdk';
import { TOOLS } from './tools';
import { streamOpenRouter } from './openrouter';

const MODEL = process.env.VAULTEX_AI_MODEL || 'claude-opus-5-5';
// Without a Claude key, Ask Vaultex runs on OpenRouter. 'openrouter/free' picks
// a free model that can use tools; set OPENROUTER_MODEL to choose one.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const EFFORT = (process.env.VAULTEX_AI_EFFORT || 'medium') as 'low' | 'medium' | 'high';
const MAX_BODY_BYTES = 400_000;
const MAX_MESSAGES = 80;

const SYSTEM = `You are Ask Vaultex, the money helper built into Vaultex, the back office of a forex brokerage. Staff talk to you to understand their company's money and to get daily work done faster.

How you work
- Every number you say must come from a tool call in this conversation. Never guess or invent a figure, a name or a date. If the tools do not have it, say so plainly and say where in the app they could look.
- Call tools before answering anything about the books. For broad questions start with get_snapshot. Call several tools in one go when you need several things.
- Amounts are in USD unless a tool says another currency. Write money like $12,480 (no decimals over $1,000 unless the cents matter). Write the currency for non-USD amounts, like 5,000 EUR.
- When a chart says it faster, call show_chart once with the real numbers, then refer to it in one short sentence.
- When the person wants money moved (add money, take out money, pay a partner, pay a cost, move money), call draft_money_request. Tell them it is only a draft: they press "Create request", and a second person still has to say OK before money moves. You can never move money, approve, post entries or change settings yourself.
- When the natural next step is a page in the app, call open_page so they get a button.

How you talk
- Answer in the language the person writes in. Arabic gets clear Modern Standard Arabic; keep numbers, account numbers and symbols in Western digits.
- Use simple words a 10-year-old could follow. Say "money clients keep with us", not "client liabilities"; "says OK", not "authorises"; "MT5 and the books do not match", not "reconciliation variance". If you must use a finance word, explain it in a few words the first time.
- Lead with the answer in the first sentence. Then the few facts that matter, as a short list or a small table. Then, when it helps, one clear next step.
- Keep it short. Most answers fit in under 120 words. A daily briefing can be longer, but every line must earn its place.
- Point out what needs attention and why it matters (money at risk, someone waiting, a number that does not match), and rank it: what to do first.
- Never use em dashes.

Context
- The company and every person in it are sample data in a demo. Treat it as real work anyway.
- Two-person rule: whoever makes a request cannot be the one who says OK to it.
- Request stages: needs OK (pending) -> OK given (confirmed) -> money sent on MT5 (executed) -> written in the books (voucher). A day can only be closed when nothing is stuck between OK given and written in the books.
- "Check the numbers" compares each client's balance in the books with MT5. A difference that is explained by money already sent or trades closed today is normal and clears when the day is closed. A difference with no reason must be looked at.
- Each user message starts with a <context> block from the app (today's date, the page they are on, who they are). Use it, but do not repeat it back.`;

type ClientMessage = Anthropic.Beta.BetaMessageParam;

interface AskBody {
  messages: ClientMessage[];
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Best effort per-instance limit so one visitor cannot run up the bill.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 30;
}

function validMessages(value: unknown): value is ClientMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return false;
  return value.every((m, i) =>
    m && typeof m === 'object'
    && (m.role === 'user' || m.role === 'assistant')
    && (typeof m.content === 'string' || Array.isArray(m.content))
    && (i > 0 || m.role === 'user'));
}

export async function handleAsk(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const useClaude = !!process.env.ANTHROPIC_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!useClaude && !openRouterKey) return json(503, { error: 'not_configured' });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) return json(429, { error: 'too_many' });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'too_long' });
  let body: AskBody;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'bad_json' }); }
  if (!validMessages(body.messages)) return json(400, { error: 'bad_messages' });

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, event: unknown) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));

  const stream = new ReadableStream({
    async start(controller) {
      if (!useClaude && openRouterKey) {
        try {
          await streamOpenRouter({
            key: openRouterKey, model: OPENROUTER_MODEL, system: SYSTEM, tools: TOOLS,
            messages: body.messages as never, signal: request.signal,
            send: (e) => send(controller, e), referer: request.headers.get('origin') ?? undefined,
          });
        } catch (err) {
          if (!(err instanceof Error && err.name === 'AbortError')) send(controller, { t: 'error', code: 'failed' });
        } finally {
          controller.close();
        }
        return;
      }
      try {
        const turn = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: EFFORT },
          cache_control: { type: 'ephemeral' },
          system: SYSTEM,
          tools: TOOLS,
          messages: body.messages,
        }, { signal: request.signal });

        for await (const event of turn) {
          if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
            send(controller, { t: 'tool', name: event.content_block.name });
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send(controller, { t: 'text', d: event.delta.text });
          }
        }
        const final = await turn.finalMessage();
        send(controller, { t: 'done', content: final.content, stop: final.stop_reason });
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) send(controller, { t: 'error', code: 'not_configured' });
        else if (err instanceof Anthropic.RateLimitError) send(controller, { t: 'error', code: 'busy' });
        else if (err instanceof Anthropic.BadRequestError) send(controller, { t: 'error', code: 'bad_request', message: err.message });
        else if (err instanceof Anthropic.APIUserAbortError) { /* the person pressed stop */ }
        else if (err instanceof Anthropic.APIError) send(controller, { t: 'error', code: 'upstream', message: `${err.status ?? ''}` });
        else send(controller, { t: 'error', code: 'failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    },
  });
}
