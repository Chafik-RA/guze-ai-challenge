import express from "express";
import { TransactionController } from "../controllers/transaction.controller.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireOwnership } from "../middlewares/ownership.middleware.js";
import { validateBody } from "../validators/auth.validator.js";
import {
  createWithdrawalSchema,
  createDepositSchema,
} from "../validators/transaction.validator.js";

const router = express.Router();
const transactionController = new TransactionController();
const transactionRepository = new TransactionRepository();

router.get("/deposits", authenticate, transactionController.listDeposits);

router.get(
  "/deposits/:id",
  authenticate,
  requireOwnership((req) =>
    transactionRepository.findDepositById(String(req.params.id)),
  ),
  transactionController.getDepositById,
);

// POST /challenge/v1/transactions/deposits (Auth + OTP + Idempotency required)
router.post(
  "/deposits",
  authenticate,
  validateBody(createDepositSchema),
  transactionController.createDeposit,
);

router.get("/withdrawals", authenticate, transactionController.listWithdrawals);

router.get(
  "/withdrawals/:id",
  authenticate,
  requireOwnership((req) =>
    transactionRepository.findWithdrawalById(String(req.params.id)),
  ),
  transactionController.getWithdrawalById,
);

// POST /challenge/v1/transactions/withdrawals (Auth + OTP + Idempotency required per AC-11, PT-13)
router.post(
  "/withdrawals",
  authenticate,
  validateBody(createWithdrawalSchema),
  transactionController.createWithdrawal,
);

export default router;
