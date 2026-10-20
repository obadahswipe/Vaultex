import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBooks } from '@/stores/books.store';
import { runTool, snapshotNow } from './runTool';
import { useAskVaultex, type AskContext } from './chat.store';

const ctx: AskContext = { page: '/', pageName: 'Home', userName: 'Ahmad', userRole: 'admin', lang: 'en' };

/** A fake /api/ask that answers with the given turns, one per call. */
function fakeServer(turns: object[][]) {
  const bodies: { messages: { role: string; content: { type: string; [k: string]: unknown }[] }[] }[] = [];
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    const events = turns.shift() ?? [];
    const text = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
    return new Response(new Blob([text]).stream(), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { bodies, fetchMock };
}

describe('Ask Vaultex tools', () => {
  beforeEach(() => useBooks.getState().resetDemo());

  it('gives a snapshot that matches the books', () => {
    const s = snapshotNow();
    expect(s.company).toBe('Demo Markets Ltd');
    expect(s.money_on_hand_cash_and_banks).toBeGreaterThan(0);
    expect(s.money_requests.needs_ok).toBe(useBooks.getState().requests.filter((r) => r.status === 'pending').length);
  });

  it('finds a client by part of the name', () => {
    const first = useBooks.getState().clients[0];
    const out = runTool('get_client', { client: first.name.split(' ')[0].toLowerCase() });
    expect(out.isError).toBeFalsy();
    expect((out.result as { account: string }).account).toBe(first.accountNo);
  });

  it('drafts a request without creating it', () => {
    const before = useBooks.getState().requests.length;
    const client = useBooks.getState().clients[0];
    const out = runTool('draft_money_request', { type: 'deposit', account: client.name, amount: 500, currency: 'USD' });
    expect(out.isError).toBeFalsy();
    expect(out.attachment?.kind).toBe('draft');
    expect(useBooks.getState().requests.length).toBe(before);
    if (out.attachment?.kind === 'draft') {
      expect(out.attachment.draft.balanceAfter).toBeCloseTo(out.attachment.draft.balanceBefore + out.attachment.draft.amount, 2);
    }
  });

  it('says clearly when a name is not found', () => {
    const out = runTool('get_client', { client: 'Nobody Like This' });
    expect(out.isError).toBe(true);
  });
});

describe('Ask Vaultex conversation', () => {
  beforeEach(() => { useBooks.getState().resetDemo(); useAskVaultex.getState().reset(); });
  afterEach(() => vi.unstubAllGlobals());

  it('runs the tools in the browser and sends the results back', async () => {
    const { bodies } = fakeServer([
      [
        { t: 'tool', name: 'get_snapshot' },
        { t: 'done', stop: 'tool_use', content: [{ type: 'tool_use', id: 'tu_1', name: 'get_snapshot', input: {} }] },
      ],
      [
        { t: 'text', d: 'You have ' },
        { t: 'text', d: 'money.' },
        { t: 'done', stop: 'end_turn', content: [{ type: 'text', text: 'You have money.' }] },
      ],
    ]);
    await useAskVaultex.getState().ask('How are we doing?', ctx);

    const msgs = useAskVaultex.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[1].text).toBe('You have money.');
    expect(msgs[1].tools).toEqual(['get_snapshot']);
    expect(msgs[1].streaming).toBe(false);

    // Second call carries the assistant tool call and our tool result.
    const second = bodies[1].messages;
    expect(second[0].content[0].text).toContain('<context>');
    expect(second[1].content[0].type).toBe('tool_use');
    const result = second[2].content[0];
    expect(result.type).toBe('tool_result');
    expect(result.tool_use_id).toBe('tu_1');
    expect(JSON.parse(String(result.content)).company).toBe('Demo Markets Ltd');
  });

  it('keeps history for the next question', async () => {
    const { bodies } = fakeServer([
      [{ t: 'done', stop: 'end_turn', content: [{ type: 'text', text: 'One.' }] }],
      [{ t: 'done', stop: 'end_turn', content: [{ type: 'text', text: 'Two.' }] }],
    ]);
    await useAskVaultex.getState().ask('First', ctx);
    await useAskVaultex.getState().ask('Second', ctx);
    expect(bodies[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
  });

  it('shows the not-switched-on note when the server has no key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"not_configured"}', { status: 503 })));
    await useAskVaultex.getState().ask('Hi', ctx);
    expect(useAskVaultex.getState().messages[1].error).toBe('not_configured');
  });

  it('adds a draft card when the model drafts a request', async () => {
    const client = useBooks.getState().clients[0];
    fakeServer([
      [{ t: 'done', stop: 'tool_use', content: [{ type: 'tool_use', id: 'tu_d', name: 'draft_money_request', input: { type: 'deposit', account: client.accountNo, amount: 250 } }] }],
      [{ t: 'done', stop: 'end_turn', content: [{ type: 'text', text: 'Drafted.' }] }],
    ]);
    await useAskVaultex.getState().ask('Add 250 for them', ctx);
    const att = useAskVaultex.getState().messages[1].attachments;
    expect(att).toHaveLength(1);
    expect(att[0].kind).toBe('draft');
  });
});
