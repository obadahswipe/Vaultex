-- ================================================
-- MIGRATION: 005_wallets
-- Wallet architecture: separate from trading accounts
-- Supports wallet-first, direct-fund, and hybrid models
-- ================================================

CREATE TABLE wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  balance         DECIMAL(18,6) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(18,6) NOT NULL DEFAULT 0,  -- held for pending withdrawals
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, client_id, currency)
);

CREATE TABLE wallet_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id),
  wallet_id        UUID REFERENCES wallets(id),
  transaction_type VARCHAR(50) NOT NULL,
  -- DEPOSIT / WITHDRAWAL / TRANSFER_IN / TRANSFER_OUT
  -- FUND_ACCOUNT / WITHDRAW_FROM_ACCOUNT / ADJUSTMENT
  amount           DECIMAL(18,6) NOT NULL,
  currency         CHAR(3) NOT NULL,
  amount_usd       DECIMAL(18,6) NOT NULL,
  exchange_rate    DECIMAL(18,6) DEFAULT 1,
  balance_after    DECIMAL(18,6) NOT NULL,
  reference_id     UUID,
  reference_type   VARCHAR(50),
  -- PAYMENT / INTERNAL_TRANSFER / MT5_FUNDING / JOURNAL
  status           VARCHAR(20) DEFAULT 'COMPLETED',
  -- PENDING / COMPLETED / REVERSED
  narration        TEXT,
  created_by       UUID REFERENCES users(id),
  journal_id       UUID REFERENCES journal_entries(id),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Wallet-to-wallet internal transfers
CREATE TABLE wallet_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id),
  from_wallet_id   UUID REFERENCES wallets(id),
  to_wallet_id     UUID REFERENCES wallets(id),
  amount           DECIMAL(18,6) NOT NULL,
  from_currency    CHAR(3) NOT NULL,
  to_currency      CHAR(3) NOT NULL,
  exchange_rate    DECIMAL(18,6) DEFAULT 1,
  amount_converted DECIMAL(18,6) NOT NULL,
  status           VARCHAR(20) DEFAULT 'COMPLETED',
  narration        TEXT,
  created_by       UUID REFERENCES users(id),
  journal_id       UUID REFERENCES journal_entries(id),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Funding model config per tenant
ALTER TABLE tenants ADD COLUMN funding_model VARCHAR(20) DEFAULT 'WALLET_FIRST';
-- WALLET_FIRST / DIRECT / HYBRID

CREATE INDEX idx_wallets_client    ON wallets(client_id);
CREATE INDEX idx_wallet_tx_wallet  ON wallet_transactions(wallet_id, created_at);
CREATE INDEX idx_wallet_tx_client  ON wallet_transactions(tenant_id, created_at);
