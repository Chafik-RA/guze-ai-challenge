import express from "express";
import AuthRouter from "./auth.route.js";
import TransactionsRouter from "./transaction.routes.js";
import TradingRouter from "./trading.route.js";
import SecurityRouter from "./security.route.js";
import ActionRouter from "./action.route.js";
import AuditRouter from "./audit.route.js";

const router = express.Router();

router.use("/auth", AuthRouter);
router.use("/trading", TradingRouter);
router.use("/transactions", TransactionsRouter);
router.use("/security", SecurityRouter);
router.use("/actions", ActionRouter);
router.use("/audit", AuditRouter);

export default router;
