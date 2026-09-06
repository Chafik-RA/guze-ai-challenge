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
  replayed?: boolean;
  withdrawal: {
    withdrawal_id: string;
    amount: number;
    currency: string;
    status_code: number;
    status: string;
  };
}