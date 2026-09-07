import { pool } from "../db/db.js";
import type { SupportTicketRow } from "../types/db.types.js";

export class SupportRepository {
  async createTicket(params: {
    ticketId: string;
    memberId: number | null;
    intent: string | null;
    conversationSummary: string | null;
    relatedReference?: string | null | undefined;
    errorCode?: string | null | undefined;
    reason: string | null;
  }): Promise<SupportTicketRow> {
    const result = await pool.query<SupportTicketRow>(
      `INSERT INTO support_tickets
        (ticket_id, member_id, intent, conversation_summary, related_reference, error_code, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
       RETURNING *`,
      [
        params.ticketId,
        params.memberId,
        params.intent,
        params.conversationSummary,
        params.relatedReference ?? null,
        params.errorCode ?? null,
        params.reason,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Failed to create support ticket");
    return row;
  }

  async findById(ticketId: string): Promise<SupportTicketRow | null> {
    const result = await pool.query<SupportTicketRow>(
      `SELECT * FROM support_tickets WHERE ticket_id = $1`,
      [ticketId],
    );
    return result.rows[0] ?? null;
  }

  async listByMember(memberId: number): Promise<SupportTicketRow[]> {
    const result = await pool.query<SupportTicketRow>(
      `SELECT * FROM support_tickets WHERE member_id = $1 ORDER BY created_at DESC`,
      [memberId],
    );
    return result.rows;
  }
}
