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