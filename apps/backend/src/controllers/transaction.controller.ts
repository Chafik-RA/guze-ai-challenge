import type { Response, NextFunction } from "express";
import { TransactionService } from "../services/transaction.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import type { DepositRow, WithdrawalRow } from "../types/db.types.js";

const transactionService = new TransactionService();

export class TransactionController {
  public listDeposits = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const items = await transactionService.listDeposits(req.member!.memberId);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };

  // ไม่มีการ query DB ในนี้เลย — ใช้ resource ที่ requireOwnership ดึงมาแล้ว
  public getDepositById = (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const row = res.locals.resource as DepositRow;
      const data = transactionService.mapDepositToResponse(row);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  };

  public listWithdrawals = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const items = await transactionService.listWithdrawals(
        req.member!.memberId,
      );
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };

  public getWithdrawalById = (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const row = res.locals.resource as WithdrawalRow;
      const data = transactionService.mapWithdrawalToResponse(row);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  };

  public createWithdrawal = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const {
        wallet_id,
        amount,
        currency,
        destination_id,
        action_id,
        verification_token,
        simulate_timeout,
      } = req.body;
      const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
      const simulateTimeout = req.headers["x-simulate-timeout"] === "true" || simulate_timeout === true;

      const result = await transactionService.createWithdrawal({
        memberId: req.member!.memberId,
        walletId: wallet_id,
        amount,
        currency,
        destinationId: destination_id,
        actionId: action_id,
        verificationToken: verification_token,
        idempotencyKey,
        simulateTimeout,
      });

      const statusCode = result.replayed ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  };

  public createDeposit = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const {
        wallet_id,
        amount,
        currency,
        payment_method,
        action_id,
        verification_token,
        simulate_timeout,
      } = req.body;
      const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
      const simulateTimeout = req.headers["x-simulate-timeout"] === "true" || simulate_timeout === true;

      const result = await transactionService.createDeposit({
        memberId: req.member!.memberId,
        walletId: wallet_id,
        amount,
        currency,
        paymentMethod: payment_method,
        actionId: action_id,
        verificationToken: verification_token,
        idempotencyKey,
        simulateTimeout,
      });

      const statusCode = result.replayed ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  };
}
