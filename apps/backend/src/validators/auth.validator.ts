import { z } from "zod";
import type { NextFunction, Request, Response } from "express";
import { ErrorCode, type HttpError } from "@ai-challenge/shared/error-codes";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  display_name: z.string().min(1, "display_name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const error = new Error(
        result.error.issues[0]?.message ?? "Invalid request body",
      ) as HttpError;
      error.status = 400;
      error.code = ErrorCode.VALIDATION_ERROR;
      return next(error);
    }
    req.body = result.data;
    next();
  };
}
