-- 001_schema.sql
-- Core schema for Guze AI Agent Challenge 2026 (BUILD DIFFERENT)
-- Matches concepts in 05_API_CONTRACT.md, 06_MOCK_DATA.md, 07_ACCEPTANCE_CRITERIA.md

CREATE TABLE members (
  member_id       SERIAL PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  kyc_status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved'
  two_factor_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token       TEXT PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES members(member_id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
  wallet_id   TEXT PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES members(member_id),
  type        TEXT NOT NULL DEFAULT 'main',
  currency    TEXT NOT NULL,
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE withdrawal_destinations (
  destination_id  TEXT PRIMARY KEY,
  member_id       INTEGER NOT NULL REFERENCES members(member_id),
  type            TEXT NOT NULL DEFAULT 'bank',
  display_masked  TEXT NOT NULL
);

CREATE TABLE account_types (
  account_type_id  INTEGER PRIMARY KEY,
  account_name     TEXT NOT NULL,
  type             TEXT NOT NULL,        -- 'live' | 'demo'
  category         TEXT NOT NULL,
  currency         TEXT NOT NULL,
  leverages        INTEGER[] NOT NULL,
  account_limit    INTEGER NOT NULL,
  minimum_deposit  NUMERIC(18,2) NOT NULL DEFAULT 0,
  maximum_deposit  NUMERIC(18,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active'  -- 'active' | 'inactive'
);

CREATE TABLE mt5_accounts (
  account_id       TEXT PRIMARY KEY,
  member_id        INTEGER NOT NULL REFERENCES members(member_id),
  account_type_id  INTEGER NOT NULL REFERENCES account_types(account_type_id),
  leverage         INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deposits (
  deposit_id    TEXT PRIMARY KEY,
  member_id     INTEGER NOT NULL REFERENCES members(member_id),
  amount        NUMERIC(18,2) NOT NULL,
  currency      TEXT NOT NULL,
  method        TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at   TIMESTAMPTZ
);

CREATE TABLE withdrawals (
  withdrawal_id   TEXT PRIMARY KEY,
  member_id       INTEGER NOT NULL REFERENCES members(member_id),
  wallet_id       TEXT NOT NULL REFERENCES wallets(wallet_id),
  destination_id  TEXT REFERENCES withdrawal_destinations(destination_id),
  amount          NUMERIC(18,2) NOT NULL,
  currency        TEXT NOT NULL,
  method          TEXT NOT NULL DEFAULT 'bank_transfer',
  status_code     INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at     TIMESTAMPTZ
);

-- Confirmation snapshot for every L3 (protected) action.
-- payload_snapshot is what the user confirmed — must match exactly what gets executed (AC-12, AC-13).
CREATE TABLE action_drafts (
  action_id         TEXT PRIMARY KEY,
  member_id         INTEGER NOT NULL REFERENCES members(member_id),
  intent            TEXT NOT NULL,       -- e.g. 'CREATE_MT5' | 'WITHDRAW_REQUEST'
  payload_snapshot  JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft', -- draft | confirmed | invalidated | executed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at      TIMESTAMPTZ
);

-- OTP/step-up verification, scoped to one action_id (AC-14, AC-15)
CREATE TABLE otp_verifications (
  action_id           TEXT PRIMARY KEY REFERENCES action_drafts(action_id),
  verified            BOOLEAN NOT NULL DEFAULT false,
  verification_token  TEXT,
  expires_at          TIMESTAMPTZ,
  attempted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: same (member, action_type, key) must return the same result, never create twice (AC-16, AC-17)
CREATE TABLE idempotency_keys (
  idempotency_key  TEXT NOT NULL,
  member_id        INTEGER NOT NULL REFERENCES members(member_id),
  action_type      TEXT NOT NULL,
  request_id       TEXT NOT NULL,
  result_snapshot  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (idempotency_key, action_type)
);

-- Audit trail for every protected action attempt (AC-23). Never store raw OTP/token/password here.
CREATE TABLE audit_events (
  id                  SERIAL PRIMARY KEY,
  member_id           INTEGER REFERENCES members(member_id),
  intent              TEXT NOT NULL,
  action              TEXT NOT NULL,
  action_id           TEXT,
  confirmation        TEXT,   -- 'confirmed' | 'not_confirmed'
  step_up             TEXT,   -- 'passed' | 'failed' | 'not_required'
  result              TEXT,   -- 'success' | 'error' | 'unknown_result'
  request_reference   TEXT,
  error_code          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_tickets (
  ticket_id           TEXT PRIMARY KEY,
  member_id           INTEGER REFERENCES members(member_id),
  intent              TEXT,
  conversation_summary TEXT,
  related_reference   TEXT,
  error_code          TEXT,
  reason              TEXT,
  status              TEXT NOT NULL DEFAULT 'open',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per chat session; tracks where the conversation is in the state machine (02_AI_CONVERSATION_RULES.md §15)
CREATE TABLE conversation_states (
  session_id      TEXT PRIMARY KEY,
  member_id       INTEGER REFERENCES members(member_id),
  current_state   TEXT NOT NULL DEFAULT 'PUBLIC',
  current_intent  TEXT,
  current_action_id TEXT REFERENCES action_drafts(action_id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
