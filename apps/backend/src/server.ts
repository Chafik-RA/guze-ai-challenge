import "./load-env.js";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { ErrorCode } from "@ai-challenge/shared/error-codes";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Plain health check — no DB dependency, just confirms the container is up.
// Also proves the @shared/* import alias resolves correctly (backend <-> shared/types).
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

// TODO: mount /challenge/v1/* routers here as you build them
// app.use("/challenge/v1/auth", authRouter);
// app.use("/challenge/v1/trading", tradingRouter);
// app.use("/challenge/v1/transactions", transactionsRouter);
// app.use("/challenge/v1/security", securityRouter);
// app.use("/challenge/v1/support", supportRouter);
// app.use("/challenge/v1/audit", auditRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
