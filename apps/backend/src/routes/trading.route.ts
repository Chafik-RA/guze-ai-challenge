import express from "express";
import { AccountTypeController } from "../controllers/account-type.controller.js";
import { AccountTypeRepository } from "../repositories/account-type.repository.js";
import { Mt5AccountController } from "../controllers/mt5-account.controller.js";
import { Mt5AccountRepository } from "../repositories/mt5-account.repository.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireOwnership } from "../middlewares/ownership.middleware.js";
import { createHttpError } from "../utils/http-error.util.js";
import { ErrorCode } from "@ai-challenge/shared/error-codes";
import { validateBody } from "../validators/auth.validator.js";
import { createMT5Schema } from "../validators/trading.validator.js";

const router = express.Router();

const accountTypeController = new AccountTypeController();
const accountTypeRepository = new AccountTypeRepository();
const mt5AccountController = new Mt5AccountController();
const mt5AccountRepository = new Mt5AccountRepository();

// --- Account Types Endpoints (Public FAQ / KB - No auth required per AC-01 & PT-01) ---
router.get("/account-types", accountTypeController.listActive);

router.get(
  "/account-types/:id",
  async (req, res, next) => {
    try {
      const accountTypeId = Number(req.params.id);
      if (Number.isNaN(accountTypeId)) {
        throw createHttpError(
          404,
          "Account type not found",
          ErrorCode.ACCOUNT_TYPE_NOT_FOUND,
        );
      }
      const row = await accountTypeRepository.findById(accountTypeId);
      if (!row) {
        throw createHttpError(
          404,
          "Account type not found",
          ErrorCode.ACCOUNT_TYPE_NOT_FOUND,
        );
      }
      res.locals.resource = row;
      next();
    } catch (err) {
      next(err);
    }
  },
  accountTypeController.getById,
);

// --- My Trading Accounts Endpoints (Auth required per 05_API_CONTRACT.md §4 & PT-07) ---
router.get("/accounts", authenticate, mt5AccountController.listMine);

router.get(
  "/accounts/:id",
  authenticate,
  requireOwnership((req) =>
    mt5AccountRepository.findById(String(req.params.id)),
  ),
  mt5AccountController.getById,
);

// POST /challenge/v1/trading/accounts (Auth + OTP + Idempotency required per AC-07, PT-08)
router.post(
  "/accounts",
  authenticate,
  validateBody(createMT5Schema),
  mt5AccountController.create,
);

export default router;
