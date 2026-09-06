import type { NextFunction, Request, Response } from "express";
import { AuthRepository } from "../repositories/auth.repository.js";
import { ErrorCode, type HttpError } from "@ai-challenge/shared/error-codes";

const authRepository = new AuthRepository();

export interface AuthenticatedRequest extends Request {
  member?: { memberId: number; email: string };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    const error = new Error("Authentication required") as HttpError;
    error.status = 401;
    error.code = ErrorCode.AUTH_REQUIRED;
    return next(error);
  }

  const session = await authRepository.findValidSession(token);
  if (!session) {
    const error = new Error("Session invalid or expired") as HttpError;
    error.status = 401;
    error.code = ErrorCode.AUTH_REQUIRED;
    return next(error);
  }

  const member = await authRepository.findById(session.member_id);
  if (!member) {
    const error = new Error("Session invalid or expired") as HttpError;
    error.status = 401;
    error.code = ErrorCode.AUTH_REQUIRED;
    return next(error);
  }

  req.member = { memberId: member.member_id, email: member.email };
  next();
}
