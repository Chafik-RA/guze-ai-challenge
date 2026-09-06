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