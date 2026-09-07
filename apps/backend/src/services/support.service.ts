import { randomBytes } from "node:crypto";
import type {
  CreateTicketRequest,
  CreateTicketResponse,
} from "@ai-challenge/shared/support.types";
import { SupportRepository } from "../repositories/support.repository.js";
import { createHttpError } from "../utils/http-error.util.js";
import { ErrorCode } from "@ai-challenge/shared/error-codes";

const supportRepository = new SupportRepository();

export class SupportService {
  /**
   * Sanitizes sensitive text before saving to database (AC-20, AC-21).
   * Strips/masks raw OTPs, JWT tokens, Bearer tokens, and password strings.
   */
  private sanitizeContext(text: string | null | undefined): string | null {
    if (!text) return null;
    let sanitized = text;

    // Mask JWT/Bearer tokens
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, "Bearer [MASKED_TOKEN]");
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9-_.]+/g, "[MASKED_JWT]");
    sanitized = sanitized.replace(/mock-token-[a-zA-Z0-9-]+/g, "[MASKED_TOKEN]");

    // Mask passwords and explicit OTP values
    sanitized = sanitized.replace(/password\s*[:=]\s*[^\s,]+/gi, "password: [MASKED]");
    sanitized = sanitized.replace(/\b\d{6}\b/g, "[MASKED_OTP]");

    return sanitized;
  }

  async createTicket(
    data: CreateTicketRequest,
    memberId?: number | null,
  ): Promise<CreateTicketResponse> {
    if (!data.intent || !data.conversation_summary || !data.reason) {
      throw createHttpError(
        400,
        "Missing required fields: intent, conversation_summary, and reason are required.",
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const ticketId = `SUP-${randomBytes(2).toString("hex").toUpperCase()}`;
    const sanitizedSummary = this.sanitizeContext(data.conversation_summary);
    const sanitizedReason = this.sanitizeContext(data.reason);

    const row = await supportRepository.createTicket({
      ticketId,
      memberId: memberId ?? null,
      intent: data.intent,
      conversationSummary: sanitizedSummary,
      relatedReference: data.related_reference ?? null,
      errorCode: data.error_code ?? null,
      reason: sanitizedReason,
    });

    return {
      ticket_id: row.ticket_id,
      status: "open",
    };
  }

  async getTicket(ticketId: string) {
    const ticket = await supportRepository.findById(ticketId);
    if (!ticket) {
      throw createHttpError(404, "Support ticket not found", ErrorCode.RESOURCE_NOT_FOUND);
    }
    return ticket;
  }

  async listTickets(memberId: number) {
    return supportRepository.listByMember(memberId);
  }
}
