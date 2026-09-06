import { ErrorCode } from "@ai-challenge/shared/error-codes";
import { createHttpError } from "../utils/http-error.util.js";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import type { NextFunction, Response } from "express";
import type { DepositRow } from "../types/db.types.js";

export function requireOwnership<T extends { member_id: number }>(
  getResource: (req: AuthenticatedRequest) => Promise<T | null>,
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const resource = await getResource(req);
      if (!resource) {
        throw createHttpError(
          404,
          "Resource not found",
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }
      if (resource.member_id !== req.member?.memberId) {
        throw createHttpError(
          404,
          "Resource not found",
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }
      res.locals.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}
