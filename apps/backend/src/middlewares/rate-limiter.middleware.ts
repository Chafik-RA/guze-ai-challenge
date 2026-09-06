import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  limit: 500, // Limit requests per window,
  standardHeaders: "draft-8", //Combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});
