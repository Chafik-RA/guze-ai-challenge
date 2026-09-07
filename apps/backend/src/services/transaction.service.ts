import { randomBytes } from "node:crypto";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { ActionDraftService } from "./action-draft.service.js";
import { OtpService } from "./otp.service.js";
import { AuditService } from "./audit.service.js";
import { IdempotencyService } from "./idempotency.service.js";
import { createHttpError } from "../utils/http-error.util.js";
import { ErrorCode } from "@ai-challenge/shared/error-codes";
import type { DepositRow, WithdrawalRow } from "../types/db.types.js";
import type {
  Deposit,
  Withdrawal,
  CreateWithdrawalResponse,
} from "@ai-challenge/shared/transaction.types";

const transactionRepository = new TransactionRepository();
const authRepository = new AuthRepository();
const actionDraftService = new ActionDraftService();
const otpService = new OtpService();
const auditService = new AuditService();
const idempotencyService = new IdempotencyService();

// Status mappings according to 08_ERROR_STATUS_CATALOG.md
const DEPOSIT_STATUS_LABELS: Record<number, string> = {
  0: "pending",
  1: "approve",
  2: "reject",
  3: "processing",
  4: "mismatch",
  5: "pending_refund",
  6: "refunded",
};

const WITHDRAWAL_STATUS_LABELS: Record<number, string> = {
  0: "pending",
  1: "approve",
  2: "reject_refund",
  3: "pending_approve",
  4: "pending_reject",
  5: "unused",
  6: "reject_no_refund",
  99: "initial",
};

function resolveDepositStatus(statusCode: number): string {
  return DEPOSIT_STATUS_LABELS[statusCode] ?? "unknown";
}

function resolveWithdrawalStatus(statusCode: number): string {
  return WITHDRAWAL_STATUS_LABELS[statusCode] ?? "unknown";
}

export class TransactionService {
  async listDeposits(memberId: number): Promise<Deposit[]> {
    const rows = await transactionRepository.findDepositsByMember(memberId);
    return rows.map(this.mapDepositToResponse);
  }

  mapDepositToResponse(row: DepositRow): Deposit {
    return {
      deposit_id: row.deposit_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      payment_method: row.method,
      status_code: row.status_code,
      status: resolveDepositStatus(row.status_code),
      created_at: row.created_at.toISOString(),
      approved_at: row.approved_at ? row.approved_at.toISOString() : null,
    };
  }

  async listWithdrawals(memberId: number): Promise<Withdrawal[]> {
    const rows = await transactionRepository.findWithdrawalsByMember(memberId);
    return rows.map(this.mapWithdrawalToResponse);
  }

  mapWithdrawalToResponse(row: WithdrawalRow): Withdrawal {
    return {
      withdrawal_id: row.withdrawal_id,
      wallet_id: row.wallet_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      payment_method: row.method,
      destination_masked: row.destination_masked ?? "",
      status_code: row.status_code,
      status: resolveWithdrawalStatus(row.status_code),
      created_at: row.created_at.toISOString(),
      approved_at: row.approved_at ? row.approved_at.toISOString() : null,
    };
  }

  async createWithdrawal(params: {
    memberId: number;
    walletId: string;
    amount: number;
    currency: string;
    destinationId: string;
    actionId?: string | undefined;
    verificationToken?: string | undefined;
    idempotencyKey?: string | undefined;
    simulateTimeout?: boolean | undefined;
  }): Promise<CreateWithdrawalResponse> {
    const {
      memberId,
      walletId,
      amount,
      currency,
      destinationId,
      actionId,
      verificationToken,
      idempotencyKey,
      simulateTimeout,
    } = params;

    // 1. Idempotency check (AC-17, PT-17)
    const replayed = await idempotencyService.getReplayedResult<CreateWithdrawalResponse>(
      idempotencyKey,
      "CREATE_WITHDRAWAL",
      memberId,
    );
    if (replayed) {
      return replayed;
    }

    // 2. KYC check (AC-11)
    const member = await authRepository.findById(memberId);
    if (!member || member.kyc_status !== "approved") {
      await auditService.record({
        memberId,
        intent: "WITHDRAW_REQUEST",
        action: "CREATE_WITHDRAWAL",
        actionId,
        result: "error",
        errorCode: ErrorCode.KYC_NOT_APPROVED,
      });
      throw createHttpError(
        422,
        "KYC approval is required before withdrawing funds",
        ErrorCode.KYC_NOT_APPROVED,
      );
    }

    // 3. Amount validation
    if (amount <= 0 || Number.isNaN(amount)) {
      throw createHttpError(
        400,
        "Withdrawal amount must be greater than zero",
        ErrorCode.INVALID_AMOUNT,
      );
    }

    // 4. Wallet check
    const wallet = await transactionRepository.findWalletById(walletId);
    if (!wallet) {
      throw createHttpError(404, "Wallet not found", ErrorCode.WALLET_NOT_FOUND);
    }
    if (wallet.member_id !== memberId) {
      throw createHttpError(404, "Wallet not found", ErrorCode.WALLET_NOT_OWNED);
    }

    // 5. Destination check
    const destination = await transactionRepository.findDestinationById(destinationId);
    if (!destination || destination.member_id !== memberId) {
      throw createHttpError(404, "Destination account not found", ErrorCode.DESTINATION_NOT_FOUND);
    }

    // 6. Balance check (PT-14)
    const currentBalance = parseFloat(wallet.balance);
    if (amount > currentBalance) {
      await auditService.record({
        memberId,
        intent: "WITHDRAW_REQUEST",
        action: "CREATE_WITHDRAWAL",
        actionId,
        result: "error",
        errorCode: ErrorCode.INSUFFICIENT_BALANCE,
      });
      throw createHttpError(
        422,
        `Insufficient balance. Current balance is ${currentBalance} ${wallet.currency}`,
        ErrorCode.INSUFFICIENT_BALANCE,
      );
    }

    // 7. Action Draft & Step-up OTP Validation (AC-12, AC-13, AC-14, AC-15, PT-15, PT-16)
    if (actionId) {
      await actionDraftService.validateAndMatchSnapshot(actionId, memberId, {
        wallet_id: walletId,
        amount,
        currency,
        destination_id: destinationId,
      });
      await otpService.validateStepUpToken(actionId, verificationToken);
    }

    // Check for simulated timeout (PT-18 / AC-18)
    if (simulateTimeout) {
      await auditService.record({
        memberId,
        intent: "WITHDRAW_REQUEST",
        action: "CREATE_WITHDRAWAL",
        actionId,
        confirmation: actionId ? "confirmed" : "not_confirmed",
        stepUp: verificationToken ? "passed" : "not_required",
        result: "unknown_result",
        errorCode: ErrorCode.INTEGRATION_TIMEOUT,
      });
      throw createHttpError(
        504,
        "Integration timeout. Result is unknown.",
        ErrorCode.INTEGRATION_TIMEOUT,
      );
    }

    // 8. Create withdrawal record (PT-13)
    const withdrawalId = `WD-${Math.floor(5000 + Math.random() * 5000)}`;
    const createdRow = await transactionRepository.createWithdrawal(
      withdrawalId,
      memberId,
      walletId,
      destinationId,
      amount,
      currency,
    );

    const requestId = `REQ-WD-${randomBytes(2).toString("hex").toUpperCase()}`;
    const response: CreateWithdrawalResponse = {
      request_id: requestId,
      withdrawal: {
        withdrawal_id: createdRow.withdrawal_id,
        amount: parseFloat(createdRow.amount),
        currency: createdRow.currency,
        status_code: createdRow.status_code,
        status: resolveWithdrawalStatus(createdRow.status_code),
      },
    };

    // 9. Record audit event (AC-23)
    await auditService.record({
      memberId,
      intent: "WITHDRAW_REQUEST",
      action: "CREATE_WITHDRAWAL",
      actionId,
      confirmation: "confirmed",
      stepUp: "passed",
      result: "success",
      requestReference: requestId,
    });

    // 10. Save Idempotency Snapshot (AC-17)
    if (idempotencyKey) {
      await idempotencyService.saveResult(
        idempotencyKey,
        memberId,
        "CREATE_WITHDRAWAL",
        requestId,
        response as unknown as Record<string, unknown>,
      );
    }

    // 11. Mark action draft as executed
    if (actionId) {
      await actionDraftService.markExecuted(actionId);
    }

    return response;
  }
}
