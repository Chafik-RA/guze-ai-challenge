import type { ErrorCode, HttpError } from "@ai-challenge/shared/error-codes";

export function createHttpError(
  status: number,
  message: string,
  code: ErrorCode,
): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  error.code = code;
  return error;
}

// เผื่อไว้ด้วย — เวลาโยน error ทั่วไปที่ไม่มี code เฉพาะ (เช่น unexpected DB error)
// จะได้ไม่ต้อง new Error(...) as HttpError เกลื่อนทุกที่
export function createInternalError(
  message = "Internal server error",
): HttpError {
  const error = new Error(message) as HttpError;
  error.status = 500;
  return error;
}
