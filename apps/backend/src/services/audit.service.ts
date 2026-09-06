import { AuditRepository } from "../repositories/audit.repository.js";
import { logger } from "../utils/logger.util.js";
import type { AuditEventRequest } from "@ai-challenge/shared/audit.types";

const auditRepository = new AuditRepository();

export class AuditService {
  async record(params: {
    memberId: number | null;
    intent: string;
    action: string;
    actionId?: string | null | undefined;
    confirmation?: string | null | undefined;
    stepUp?: string | null | undefined;
    result: string;
    requestReference?: string | null | undefined;
    errorCode?: string | null | undefined;
  }) {
    try {
      const row = await auditRepository.recordEvent(params);
      logger.info("Audit event recorded", {
        id: row.id,
        memberId: params.memberId,
        action: params.action,
        result: params.result,
      });
      return row;
    } catch (err) {
      logger.error("Failed to record audit event", err);
    }
  }

  async recordApiEvent(
    memberId: number | null,
    body: AuditEventRequest,
  ) {
    return this.record({
      memberId,
      intent: body.intent,
      action: body.action,
      actionId: body.action_id,
      confirmation: body.confirmation,
      stepUp: body.step_up,
      result: body.result,
      requestReference: body.request_reference,
      errorCode: body.error_code,
    });
  }
}
