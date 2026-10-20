// The tools Ask Vaultex can use. They run in the browser, against the same books
// the person is looking at, so the server never holds anyone's data. The names
// here must match `client/src/lib/ai/runTool.ts`.
import type Anthropic from '@anthropic-ai/sdk';

type Tool = Anthropic.Beta.BetaTool;

const str = (description: string) => ({ type: 'string' as const, description });
const num = (description: string) => ({ type: 'number' as const, description });
const int = (description: string) => ({ type: 'integer' as const, description });
const oneOf = (values: string[], description: string) => ({ type: 'string' as const, enum: values, description });

export const TOOLS: Tool[] = [
  {
    name: 'get_snapshot',
    description:
      'The whole company at a glance: money on hand, what we own and owe, profit this month and last month, money requests by stage, MT5 vs books check, partner pay owed, open trades, whether the day can be closed, and the current warnings. Call this first for any broad question ("how are we doing", "brief me", "what needs me").',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'find_clients',
    description:
      'List clients with their balance in the books, their MT5 balance and the difference. Use it to rank, filter or search clients.',
    input_schema: {
      type: 'object',
      properties: {
        query: str('Part of a name, email, account number or MT5 login. Leave out to list everyone.'),
        filter: oneOf(['all', 'owes_us', 'mismatch', 'kyc_missing', 'careful', 'inactive'],
          'owes_us = negative balance, mismatch = MT5 and books differ with no reason, kyc_missing = papers missing, careful = marked bad or fraud.'),
        sort_by: oneOf(['balance', 'name', 'difference', 'trading'], 'How to order the list. balance = biggest money first.'),
        limit: int('How many to return, 1 to 50. Default 15.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_client',
    description:
      'Everything about one client: balance, MT5 check, partner, papers, recent money requests, open and closed trades, wallets and notes.',
    input_schema: {
      type: 'object',
      properties: { client: str('Client name, account number, MT5 login or id.') },
      required: ['client'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_requests',
    description:
      'Money requests (deposits, withdrawals, partner pay, costs, transfers) with stage, amount, who made them and how long they have waited.',
    input_schema: {
      type: 'object',
      properties: {
        status: oneOf(['open', 'pending', 'confirmed', 'executed', 'voucher', 'rejected', 'all'],
          'open = not finished yet (pending + confirmed + executed). pending = needs an OK, confirmed = OK given, executed = money sent, voucher = done, rejected = said no.'),
        type: oneOf(['deposit', 'withdrawal', 'ib_withdrawal', 'ib_deposit', 'transfer_from', 'transfer_to', 'expense', 'any'], 'Kind of request.'),
        client: str('Only requests for this client or account (name or number).'),
        days: int('Only the last N days.'),
        limit: int('How many to return, 1 to 60. Default 20.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_partners',
    description: 'Every partner (IB): clients they brought, lots traded, pay earned, pay given and what we owe them now.',
    input_schema: {
      type: 'object',
      properties: {
        from: str('Start date YYYY-MM-DD. Default: first day of this month.'),
        to: str('End date YYYY-MM-DD. Default: today.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_trades',
    description:
      'Client trading: open positions and floating profit, net lots per symbol (risk), closed results, A-book vs B-book, best and worst clients.',
    input_schema: {
      type: 'object',
      properties: {
        status: oneOf(['open', 'closed', 'all'], 'Which trades. Default all.'),
        symbol: str('Only this symbol, like EURUSD or XAUUSD.'),
        client: str('Only this client (name or account).'),
        days: int('Closed trades from the last N days. Default 30.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_money_places',
    description: 'Every cash box, bank, USDT wallet and money partner with its balance in its own currency and in USD.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_profit',
    description: 'Profit and loss between two dates: each income line and each cost line, in USD.',
    input_schema: {
      type: 'object',
      properties: {
        from: str('Start date YYYY-MM-DD.'),
        to: str('End date YYYY-MM-DD.'),
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_accounts',
    description: 'Accounts from the list of accounts with their balances. Use for questions about a specific account or a group.',
    input_schema: {
      type: 'object',
      properties: {
        category: oneOf(['funds', 'banks', 'suppliers', 'staff', 'fixed', 'clients', 'ibs', 'debts', 'partners', 'revenue', 'expenses', 'any'],
          'funds = cash boxes, suppliers = money partners, staff = loans to staff, fixed = things we own, ibs = owed to partners, debts = bills, partners = owners.'),
        query: str('Part of an account name or number.'),
        limit: int('How many, 1 to 80. Default 30.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_entries',
    description: 'Entries written in the books (every time money moved), newest first, with their lines.',
    input_schema: {
      type: 'object',
      properties: {
        query: str('Words from the note, or a voucher number.'),
        account: str('Only entries that touch this account (name or number).'),
        days: int('Only the last N days.'),
        limit: int('How many, 1 to 40. Default 15.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_rates',
    description: "Today's exchange rates (USD for 1 unit) and how much each moved over the last 7 and 30 days.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_team',
    description: 'Staff, their branches and salaries, days off waiting for an answer, salaries already paid, branches, and staff logins with roles.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_activity',
    description: 'The "who did what" log: recent actions in the app, newest first.',
    input_schema: {
      type: 'object',
      properties: {
        who: str('Only actions by this person (email or name).'),
        limit: int('How many, 1 to 60. Default 25.'),
      },
      additionalProperties: false,
    },
  },
  {
    name: 'show_chart',
    description:
      'Draw a chart in the chat, under your answer. Use it when a picture says it faster than words: rankings, money over time, shares of a total. Only use numbers you got from the other tools.',
    input_schema: {
      type: 'object',
      properties: {
        kind: oneOf(['bar', 'line', 'pie'], 'bar for comparing, line for over time, pie for shares of one total (max 7 slices).'),
        title: str('Short title in the language of the conversation.'),
        unit: oneOf(['usd', 'count', 'lots', 'percent'], 'What the numbers are.'),
        series: {
          type: 'array',
          description: 'Names of the value columns, one or two. Example: ["In", "Out"].',
          items: { type: 'string' },
        },
        data: {
          type: 'array',
          description: 'The points, in order. value2 only when there are two series.',
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, value: { type: 'number' }, value2: { type: 'number' } },
            required: ['label', 'value'],
            additionalProperties: false,
          },
        },
      },
      required: ['kind', 'title', 'data'],
      additionalProperties: false,
    },
  },
  {
    name: 'draft_money_request',
    description:
      'Prepare a money request for the person to check. It is NOT created: a card appears with a "Create request" button, and even after that it still needs an OK from a second person before any money moves. Use it when asked to add money, take out money, pay a partner, pay a cost or move money.',
    input_schema: {
      type: 'object',
      properties: {
        type: oneOf(['deposit', 'withdrawal', 'ib_withdrawal', 'ib_deposit', 'expense', 'transfer_from'],
          'deposit = client adds money, withdrawal = client takes out, ib_withdrawal = pay a partner, ib_deposit = partner adds money, expense = company pays a cost, transfer_from = move money between two money places or two clients.'),
        account: str('Who the money belongs to: client name/account/MT5 login, partner name, or the cost account (for expense). For transfer_from: where the money comes from.'),
        amount: num('Amount in the currency below. More than zero.'),
        currency: oneOf(['USD', 'EUR', 'TRY', 'AED', 'USDT', 'GBP', 'SAR'], 'Currency of the amount. Default: the account currency.'),
        counter_account: str('Where the money goes in or out: a cash box or bank (name or number). For transfer_from: where the money goes to. Leave out to let Vaultex pick the best match.'),
        note: str('Short note for the team.'),
        urgent: { type: 'boolean', description: 'Mark as urgent.' },
      },
      required: ['type', 'account', 'amount'],
      additionalProperties: false,
    },
  },
  {
    name: 'open_page',
    description: 'Show a button that takes the person to a page in the app, when going there is the natural next step.',
    input_schema: {
      type: 'object',
      properties: {
        page: oneOf([
          'home', 'money_requests', 'clients', 'partners', 'partner_pay', 'trades', 'risk', 'banks_and_cash',
          'exchange_rates', 'client_wallets', 'entries', 'accounts', 'check_the_numbers', 'close_the_day',
          'reports', 'who_owes_us', 'charts', 'team', 'branches', 'owners', 'things_we_own', 'new_clients',
          'who_did_what', 'staff_logins', 'settings',
        ], 'The page.'),
        label: str('Button text, short, in the language of the conversation.'),
      },
      required: ['page'],
      additionalProperties: false,
    },
  },
];
