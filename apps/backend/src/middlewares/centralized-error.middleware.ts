import { type NextFunction, type Request, type Response } from "express";
import { ErrorCode, type HttpError } from "@ai-challenge/shared/error-codes";
import { logger } from "../utils/logger.util.js";

export const centralizedError = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error(`${req.method} ${req.path} failed`, err);

  const statusCode = err.status || 500;

  // กำหนด ErrorCode เริ่มต้นหากไม่ได้ระบุมาใน HttpError
  const errorCode: ErrorCode = err.code || ErrorCode.SERVICE_UNAVAILABLE;
  const isKnownError = Boolean(err.status && err.code);

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: isKnownError ? err.message : "Internal Server Error",
      ...(req.headers["x-request-id"] && {
        request_id: req.headers["x-request-id"] as string,
      }),
    },
  });
};
