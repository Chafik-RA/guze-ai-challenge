import { randomBytes } from "node:crypto";
import type { MT5Account, CreateMT5Response } from "@ai-challenge/shared/mt5-account.types";
import { Mt5AccountRepository } from "../repositories/mt5-account.repository.js";
import { AccountTypeRepository } from "../repositories/account-type.repository.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { ActionDraftService } from "./action-draft.service.js";
import { OtpService } from "./otp.service.js";
import { AuditService } from "./audit.service.js";
import { IdempotencyService } from "./idempotency.service.js";
import { createHttpError } from "../utils/http-error.util.js";
import { ErrorCode } from "@ai-challenge/shared/error-codes";
import type { MT5AccountRow } from "../types/db.types.js";

const mt5AccountRepository = new Mt5AccountRepository();
const accountTypeRepository = new AccountTypeRepository();
const authRepository = new AuthRepository();
const actionDraftService = new ActionDraftService();
const otpService = new OtpService();
const auditService = new AuditService();
const idempotencyService = new IdempotencyService();

export class Mt5AccountService {
  async listByMember(memberId: number): Promise<MT5Account[]> {
    const rows = await mt5AccountRepository.findByMember(memberId);
    return rows.map(this.mapToResponse);
  }

  async createMT5Account(params: {
    memberId: number;
    accountTypeId: number;
    leverage: number;
    actionId?: string | undefined;
    verificationToken?: string | undefined;
    idempotencyKey?: string | undefined;
    simulateTimeout?: boolean | undefined;
  }): Promise<CreateMT5Response> {
    const {
      memberId,
      accountTypeId,
      leverage,
      actionId,
      verificationToken,
      idempotencyKey,
      simulateTimeout,
    } = params;

    // 1. Idempotency check (AC-16, PT-17)
    const replayed = await idempotencyService.getReplayedResult<CreateMT5Response>(
      idempotencyKey,
      "CREATE_MT5",
      memberId,
    );
    if (replayed) {
      return replayed;
    }

    // 2. KYC verification (AC-11, PT-11)
    const member = await authRepository.findById(memberId);
    if (!member || member.kyc_status !== "approved") {
      await auditService.record({
        memberId,
        intent: "CREATE_MT5",
        action: "CREATE_TRADING_ACCOUNT",
        actionId,
        confirmation: actionId ? "confirmed" : "not_confirmed",
        stepUp: verificationToken ? "passed" : "not_required",
        result: "error",
        errorCode: ErrorCode.KYC_NOT_APPROVED,
      });
      throw createHttpError(
        422,
        "KYC approval is required before creating a trading account",
        ErrorCode.KYC_NOT_APPROVED,
      );
    }

    // 3. Account Type existence & active status check (AC-08, PT-09)
    const accountType = await accountTypeRepository.findById(accountTypeId);
    if (!accountType) {
      throw createHttpError(
        404,
        "Account type not found",
        ErrorCode.ACCOUNT_TYPE_NOT_FOUND,
      );
    }
    if (accountType.status !== "active") {
      await auditService.record({
        memberId,
        intent: "CREATE_MT5",
        action: "CREATE_TRADING_ACCOUNT",
        actionId,
        result: "error",
        errorCode: ErrorCode.ACCOUNT_TYPE_INACTIVE,
      });
      throw createHttpError(
        422,
        "Selected account type is not active",
        ErrorCode.ACCOUNT_TYPE_INACTIVE,
      );
    }

    // 4. Leverage validation (AC-09, PT-10)
    if (!accountType.leverages.includes(leverage)) {
      await auditService.record({
        memberId,
        intent: "CREATE_MT5",
        action: "CREATE_TRADING_ACCOUNT",
        actionId,
        result: "error",
        errorCode: ErrorCode.INVALID_LEVERAGE,
      });
      throw createHttpError(
        422,
        `Invalid leverage selected. Available options: ${accountType.leverages.join(", ")}`,
        ErrorCode.INVALID_LEVERAGE,
      );
    }

    // 5. Account Limit validation (AC-10, PT-12)
    const existingCount = await mt5AccountRepository.countByMemberAndAccountType(
      memberId,
      accountTypeId,
    );
    if (existingCount >= accountType.account_limit) {
      await auditService.record({
        memberId,
        intent: "CREATE_MT5",
        action: "CREATE_TRADING_ACCOUNT",
        actionId,
        result: "error",
        errorCode: ErrorCode.ACCOUNT_LIMIT_REACHED,
      });
      throw createHttpError(
        422,
        `Account limit of ${accountType.account_limit} reached for this account type`,
        ErrorCode.ACCOUNT_LIMIT_REACHED,
      );
    }

    // 6. Action Draft & Step-up OTP Validation (AC-12, AC-13, AC-14, AC-15, PT-16)
    if (actionId) {
      await actionDraftService.validateAndMatchSnapshot(actionId, memberId, {
        account_type_id: accountTypeId,
        leverage,
      });
      await otpService.validateStepUpToken(actionId, verificationToken);
    }

    // Check for simulated timeout (PT-18 / AC-18)
    if (simulateTimeout) {
      await auditService.record({
        memberId,
        intent: "CREATE_MT5",
        action: "CREATE_TRADING_ACCOUNT",
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

    // 7. Generate account_id and create account (AC-07, PT-08)
    const accountId = `MT5-${Math.floor(70000 + Math.random() * 20000)}`;
    const createdRow = await mt5AccountRepository.createAccount(
      accountId,
      memberId,
      accountTypeId,
      leverage,
    );

    const requestId = `REQ-MT5-${randomBytes(2).toString("hex").toUpperCase()}`;
    const response: CreateMT5Response = {
      request_id: requestId,
      account: this.mapToResponse(createdRow),
    };

    // 8. Record audit event (AC-23)
    await auditService.record({
      memberId,
      intent: "CREATE_MT5",
      action: "CREATE_TRADING_ACCOUNT",
      actionId,
      confirmation: "confirmed",
      stepUp: "passed",
      result: "success",
      requestReference: requestId,
    });

    // 9. Save Idempotency Snapshot (AC-16)
    if (idempotencyKey) {
      await idempotencyService.saveResult(
        idempotencyKey,
        memberId,
        "CREATE_MT5",
        requestId,
        response as unknown as Record<string, unknown>,
      );
    }

    // 10. Mark action draft as executed
    if (actionId) {
      await actionDraftService.markExecuted(actionId);
    }

    return response;
  }

  mapToResponse(row: MT5AccountRow): MT5Account {
    return {
      account_id: row.account_id,
      account_type_id: row.account_type_id,
      account_name: row.account_name,
      currency: row.currency,
      leverage: row.leverage,
      status: row.status,
    };
  }
}