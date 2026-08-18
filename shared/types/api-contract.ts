// Source of truth: 05_API_CONTRACT.md
// Keep these in sync manually with the contract doc — this file has no auto-generation yet.

// ---- Auth ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  member: {
    member_id: number;
    display_name: string;
  };
}

export interface MeResponse {
  member_id: number;
  display_name: string;
  kyc_status: "pending" | "approved";
  two_factor_enabled: boolean;
}

// ---- Account Types ----
export interface AccountType {
  account_type_id: number;
  account_name: string;
  type: "live" | "demo";
  category: string;
  currency: string;
  leverages: number[];
  account_limit: number;
  minimum_deposit: number;
  maximum_deposit: number;
  status: "active" | "inactive";
}

// ---- MT5 Accounts ----
export interface MT5Account {
  account_id: string;
  account_type_id: number;
  account_name: string;
  currency: string;
  leverage: number;
  status: string;
}

export interface CreateMT5Request {
  account_type_id: number;
  leverage: number;
}

export interface CreateMT5Response {
  request_id: string;
  replayed?: boolean;
  account: MT5Account;
}

// ---- Deposits ----
export interface Deposit {
  deposit_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status_code: number;
  status: string;
  created_at: string;
  approved_at: string | null;
}

// ---- Withdrawals ----
export interface Withdrawal {
  withdrawal_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  destination_masked: string;
  status_code: number;
  status: string;
  created_at: string;
  approved_at: string | null;
}

export interface CreateWithdrawalRequest {
  wallet_id: string;
  amount: number;
  currency: string;
  destination_id: string;
}

export interface CreateWithdrawalResponse {
  request_id: string;
  withdrawal: {
    withdrawal_id: string;
    amount: number;
    currency: string;
    status_code: number;
    status: string;
  };
}

// ---- Step-up / OTP ----
export interface OtpVerifyRequest {
  action_id: string;
  otp: string;
}

export interface OtpVerifySuccess {
  verified: true;
  verification_token: string;
  expires_in: number;
}

export interface OtpVerifyFailure {
  verified: false;
  code: "OTP_INVALID";
}

export type OtpVerifyResponse = OtpVerifySuccess | OtpVerifyFailure;

// ---- Support ----
export interface CreateTicketRequest {
  intent: string;
  conversation_summary: string;
  related_reference?: string;
  error_code?: string;
  reason: string;
}

export interface CreateTicketResponse {
  ticket_id: string;
  status: "open";
}
