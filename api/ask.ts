// POST /api/ask: one streamed turn of Ask Vaultex. See _lib/ask-core.ts.
// The time limit is set in vercel.json.
import { handleAsk } from './_lib/ask-core';

export function POST(request: Request) {
  return handleAsk(request);
}
