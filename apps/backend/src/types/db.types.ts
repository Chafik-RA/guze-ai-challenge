// Internal DB row shapes — mirror ตาราง Postgres ตรง ๆ
// ห้าม import เข้า packages/shared เด็ดขาด เพราะมี sensitive field เช่น password_hash

export interface MemberRow {
  member_id: number;
  email: string;
  password_hash: string;
  display_name: string;
  kyc_status: string;
  two_factor_enabled: boolean;
  created_at: Date;
}

export interface SessionRow {
  token: string;
  member_id: number;
  expires_at: Date;
  created_at: Date;
}

export interface DepositRow {
  deposit_id: string;
  member_id: number;
  amount: string; // NUMERIC จาก pg คืนเป็น string
  currency: string;
  method: string;
  status_code: number;
  created_at: Date;
  approved_at: Date | null;
}

export interface WithdrawalRow {
  withdrawal_id: string;
  member_id: number;
  wallet_id: string;
  destination_id: string | null;
  amount: string;
  currency: string;
  method: string;
  status_code: number;
  created_at: Date;
  approved_at: Date | null;
  destination_masked: string | null; // มาจาก JOIN กับ withdrawal_destinations
}

export interface WalletRow {
  wallet_id: string;
  member_id: number;
  type: string;
  currency: string;
  balance: string;
  status: string;
}

export interface WithdrawalDestinationRow {
  destination_id: string;
  member_id: number;
  type: string;
  display_masked: string;
}

export interface AccountTypeRow {
  account_type_id: number;
  account_name: string;
  type: string; // 'live' | 'demo'
  category: string;
  currency: string;
  leverages: number[]; // pg parse INTEGER[] เป็น number[] ให้อัตโนมัติ
  account_limit: number;
  minimum_deposit: string; // NUMERIC -> string จาก pg
  maximum_deposit: string;
  status: string; // 'active' | 'inactive'
}

export interface MT5AccountRow {
  account_id: string;
  member_id: number;
  account_type_id: number;
  account_name: string; // จาก JOIN account_types
  currency: string; // จาก JOIN account_types
  leverage: number;
  status: string;
  created_at: Date;
}

export interface ActionDraftRow {
  action_id: string;
  member_id: number;
  intent: string;
  payload_snapshot: Record<string, unknown>;
  status: string; // 'draft' | 'confirmed' | 'invalidated' | 'executed'
  created_at: Date;
  confirmed_at: Date | null;
}

export interface OtpVerificationRow {
  action_id: string;
  verified: boolean;
  verification_token: string | null;
  expires_at: Date | null;
  attempted_at: Date;
}

export interface IdempotencyKeyRow {
  idempotency_key: string;
  member_id: number;
  action_type: string;
  request_id: string;
  result_snapshot: Record<string, unknown>;
  created_at: Date;
}

export interface AuditEventRow {
  id: number;
  member_id: number | null;
  intent: string;
  action: string;
  action_id: string | null;
  confirmation: string | null;
  step_up: string | null;
  result: string;
  request_reference: string | null;
  error_code: string | null;
  created_at: Date;
}

export interface SupportTicketRow {
  ticket_id: string;
  member_id: number | null;
  intent: string | null;
  conversation_summary: string | null;
  related_reference: string | null;
  error_code: string | null;
  reason: string | null;
  status: string;
  created_at: Date;
}

export interface ConversationStateRow {
  session_id: string;
  member_id: number | null;
  current_state: string;
  current_intent: string | null;
  current_action_id: string | null;
  updated_at: Date;
}

