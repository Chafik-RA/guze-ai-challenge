// Source of truth: 05_API_CONTRACT.md §12, 02_AI_CONVERSATION_RULES.md §14

export interface CreateTicketRequest {
  intent: string;
  conversation_summary: string;
  related_reference?: string;
  error_code?: string;
  reason: string;
}

export interface CreateTicketResponse {
  ticket_id: string;
  status: "open";
}
