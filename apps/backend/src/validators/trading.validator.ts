import { z } from "zod";

export const createMT5Schema = z.object({
  account_type_id: z.number({ required_error: "account_type_id is required" }),
  leverage: z.number({ required_error: "leverage is required" }),
  action_id: z.string().optional(),
  verification_token: z.string().optional(),
});
