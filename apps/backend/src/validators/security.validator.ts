import { z } from "zod";

export const otpVerifySchema = z.object({
  action_id: z.string({ required_error: "action_id is required" }),
  otp: z.string({ required_error: "otp is required" }),
});

export const createDraftSchema = z.object({
  intent: z.string({ required_error: "intent is required" }),
  payload: z.record(z.unknown()),
});

export const auditEventSchema = z.object({
  intent: z.string({ required_error: "intent is required" }),
  action: z.string({ required_error: "action is required" }),
  action_id: z.string().optional(),
  confirmation: z.string().optional(),
  step_up: z.string().optional(),
  result: z.string({ required_error: "result is required" }),
  request_reference: z.string().optional(),
  error_code: z.string().optional(),
});
