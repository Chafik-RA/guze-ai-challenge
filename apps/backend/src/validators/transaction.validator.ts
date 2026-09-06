import { z } from "zod";

export const createWithdrawalSchema = z.object({
  wallet_id: z.string({ required_error: "wallet_id is required" }),
  amount: z.number({ required_error: "amount is required" }).positive("Amount must be greater than 0"),
  currency: z.string({ required_error: "currency is required" }),
  destination_id: z.string({ required_error: "destination_id is required" }),
  action_id: z.string().optional(),
  verification_token: z.string().optional(),
});
