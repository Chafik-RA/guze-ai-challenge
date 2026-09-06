import { pool } from "../db/db.js";
import type { AuditEventRow } from "../types/db.types.js";

export class AuditRepository {
  async recordEvent(params: {
    memberId: number | null;
    intent: string;
    action: string;
    actionId?: string | null | undefined;
    confirmation?: string | null | undefined;
    stepUp?: string | null | undefined;
    result: string;
    requestReference?: string | null | undefined;
    errorCode?: string | null | undefined;
  }): Promise<AuditEventRow> {
    const result = await pool.query<AuditEventRow>(
      `INSERT INTO audit_events
        (member_id, intent, action, action_id, confirmation, step_up, result, request_reference, error_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.memberId,
        params.intent,
        params.action,
        params.actionId ?? null,
        params.confirmation ?? null,
        params.stepUp ?? null,
        params.result,
        params.requestReference ?? null,
        params.errorCode ?? null,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Failed to record audit event");
    return row;
  }
}
