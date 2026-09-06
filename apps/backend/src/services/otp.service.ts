import { OtpRepository } from "../repositories/otp.repository.js";
import { ActionDraftRepository } from "../repositories/action-draft.repository.js";
import { createHttpError } from "../utils/http-error.util.js";
import { ErrorCode } from "@ai-challenge/shared/error-codes";
import type { OtpVerifyResponse } from "@ai-challenge/shared/security.types";

const otpRepository = new OtpRepository();
const actionDraftRepository = new ActionDraftRepository();

const VALID_MOCK_OTP = "123456";
const STEP_UP_EXPIRY_SECONDS = 300; // 5 minutes

export class OtpService {
  async verifyOtp(
    actionId: string,
    otp: string,
    memberId?: number,
  ): Promise<OtpVerifyResponse> {
    const draft = await actionDraftRepository.findById(actionId);
    if (!draft) {
      throw createHttpError(404, "Action draft not found", ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (memberId && draft.member_id !== memberId) {
      throw createHttpError(404, "Action draft not found", ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (otp !== VALID_MOCK_OTP) {
      await otpRepository.saveVerification(actionId, false, null, null);
      return {
        verified: false,
        code: "OTP_INVALID",
      };
    }

    const verificationToken = `stepup-${actionId}`;
    const expiresAt = new Date(Date.now() + STEP_UP_EXPIRY_SECONDS * 1000);

    await otpRepository.saveVerification(
      actionId,
      true,
      verificationToken,
      expiresAt,
    );

    return {
      verified: true,
      verification_token: verificationToken,
      expires_in: STEP_UP_EXPIRY_SECONDS,
    };
  }

  async validateStepUpToken(actionId: string, token?: string): Promise<void> {
    if (!token) {
      throw createHttpError(
        422,
        "Step-up OTP verification is required",
        ErrorCode.OTP_REQUIRED,
      );
    }

    const verification = await otpRepository.findByActionId(actionId);
    if (
      !verification ||
      !verification.verified ||
      verification.verification_token !== token ||
      (verification.expires_at && verification.expires_at < new Date())
    ) {
      throw createHttpError(
        422,
        "Invalid or expired OTP verification token",
        ErrorCode.OTP_INVALID,
      );
    }
  }
}
