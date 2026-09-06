// Source of truth: 02_AI_CONVERSATION_RULES.md §6-7, 05_API_CONTRACT.md

export type ActionDraftStatus = "draft" | "confirmed" | "invalidated" | "executed";

export interface ActionDraft<T = Record<string, unknown>> {
  action_id: string;
  member_id: number;
  intent: string;
  payload_snapshot: T;
  status: ActionDraftStatus;
  created_at: string;
  confirmed_at: string | null;
}

export interface CreateActionDraftRequest<T = Record<string, unknown>> {
  intent: string;
  payload: T;
}

export interface CreateActionDraftResponse<T = Record<string, unknown>> {
  action_id: string;
  status: ActionDraftStatus;
  payload_snapshot: T;
}

export interface ConfirmActionResponse<T = Record<string, unknown>> {
  action_id: string;
  status: "confirmed";
  payload_snapshot: T;
  confirmed_at: string;
}
