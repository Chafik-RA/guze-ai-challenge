const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (msg: string, meta?: object) =>
    isDev && console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg: string, meta?: object) =>
    console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg: string, err?: unknown) =>
    console.error(`[ERROR] ${msg}`, err),
};