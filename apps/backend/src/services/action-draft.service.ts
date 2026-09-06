import { randomBytes } from "node:crypto";
import { ActionDraftRepository } from "../repositories/action-draft.repository.js";
import { OtpRepository } from "../repositories/otp.repository.js";
import { createHttpError } from "../utils/http-error.util.js";
import { ErrorCode } from "@ai-challenge/shared/error-codes";
import type { ActionDraftRow } from "../types/db.types.js";

const actionDraftRepository = new ActionDraftRepository();
const otpRepository = new OtpRepository();

export class ActionDraftService {
  private generateActionId(): string {
    return `ACT-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  async createDraft(
    memberId: number,
    intent: string,
    payload: Record<string, unknown>,
  ): Promise<ActionDraftRow> {
    const actionId = this.generateActionId();
    return actionDraftRepository.createDraft(actionId, memberId, intent, payload);
  }

  async getDraft(actionId: string, memberId: number): Promise<ActionDraftRow> {
    const draft = await actionDraftRepository.findById(actionId);
    if (!draft) {
      throw createHttpError(404, "Action draft not found", ErrorCode.RESOURCE_NOT_FOUND);
    }
    if (draft.member_id !== memberId) {
      throw createHttpError(404, "Action draft not found", ErrorCode.RESOURCE_NOT_FOUND);
    }
    return draft;
  }

  async confirmDraft(actionId: string, memberId: number): Promise<ActionDraftRow> {
    const draft = await this.getDraft(actionId, memberId);
    if (draft.status === "executed") {
      throw createHttpError(409, "Action draft has already been executed", ErrorCode.DUPLICATE_REQUEST);
    }
    const updated = await actionDraftRepository.confirmDraft(actionId);
    if (!updated) throw new Error("Failed to confirm action draft");
    return updated;
  }

  async invalidateDraft(actionId: string): Promise<void> {
    await actionDraftRepository.invalidateDraft(actionId);
    await otpRepository.invalidate(actionId);
  }

  async validateAndMatchSnapshot(
    actionId: string,
    memberId: number,
    currentPayload: Record<string, unknown>,
  ): Promise<ActionDraftRow> {
    const draft = await this.getDraft(actionId, memberId);

    if (draft.status !== "confirmed") {
      throw createHttpError(
        422,
        "Explicit confirmation is required before execution",
        ErrorCode.CONFIRMATION_REQUIRED,
      );
    }

    // Compare material payload fields
    const snapshot = draft.payload_snapshot as Record<string, unknown>;
    const keys = Object.keys(currentPayload);
    let changed = false;

    for (const key of keys) {
      if (snapshot[key] !== undefined && String(snapshot[key]) !== String(currentPayload[key])) {
        changed = true;
        break;
      }
    }

    if (changed) {
      // Invalidate confirmation snapshot and step-up token on material data change (AC-13, PT-15)
      await this.invalidateDraft(actionId);
      await actionDraftRepository.updatePayload(actionId, currentPayload);
      throw createHttpError(
        422,
        "Transaction payload changed after confirmation. Please confirm again.",
        ErrorCode.CONFIRMATION_INVALIDATED,
      );
    }

    return draft;
  }

  async markExecuted(actionId: string): Promise<void> {
    await actionDraftRepository.markExecuted(actionId);
  }
}
