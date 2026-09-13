import "./load-env.js";
import express from "express";
import cors from "cors";
import { ErrorCode, type HttpError } from "@ai-challenge/shared/error-codes";
import { limiter } from "./middlewares/rate-limiter.middleware.js";
import helmet from "helmet";
import { centralizedError } from "./middlewares/centralized-error.middleware.js";
import apiRoutes from "./routes/index.js";
import { pool } from "./db/db.js";


const app = express();

// Trust first proxy if behind a proxy
app.set("trust proxy", 1);

// Seurity middleare
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4200",
  ];

const corsOption: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.includes("localhost")
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOption));

// Apply rate limiting middleware to all requests
app.use(limiter);
app.use(express.json());



// Plain health check — no DB dependency, just confirms the container is up.
// Also proves the @shared/* import alias resolves correctly (backend <-> shared/types).
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", message: "GUZE Backend API is running" });
});

app.head("/", (_req, res) => {
  res.status(200).end();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", shared_import_check: ErrorCode.AUTH_REQUIRED });
});

// DB connectivity check — confirms backend <-> postgres wiring works
app.get("/health/db", async (_req, res) => {
  try {
    const result = await pool.query("SELECT now()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

// API routes
app.use("/challenge/v1", apiRoutes);

// 404 Not Found Middleware
app.use((req, res, next) => {
  const error: HttpError = new Error("Not found...");
  error.status = 404;
  next(error);
});

// centralized error handling middleware
app.use(centralizedError);
export default app;
