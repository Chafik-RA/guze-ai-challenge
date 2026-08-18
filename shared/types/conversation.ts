// Source of truth: 02_AI_CONVERSATION_RULES.md §15, 08_ERROR_STATUS_CATALOG.md §3

export const ConversationState = {
  PUBLIC: "PUBLIC",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTHENTICATED: "AUTHENTICATED",
  COLLECTING_DATA: "COLLECTING_DATA",
  VALIDATING: "VALIDATING",
  CONFIRMATION_PENDING: "CONFIRMATION_PENDING",
  STEP_UP_AUTH_PENDING: "STEP_UP_AUTH_PENDING",
  EXECUTING: "EXECUTING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
  UNKNOWN_RESULT: "UNKNOWN_RESULT",
  HANDOFF: "HANDOFF",
} as const;

export type ConversationState = (typeof ConversationState)[keyof typeof ConversationState];

// Source of truth: 02_AI_CONVERSATION_RULES.md §3
export const Intent = {
  FAQ: "FAQ",
  ACCOUNT_INFO: "ACCOUNT_INFO",
  TRANSACTION_STATUS: "TRANSACTION_STATUS",
  CREATE_MT5: "CREATE_MT5",
  DEPOSIT_REQUEST: "DEPOSIT_REQUEST",
  WITHDRAW_REQUEST: "WITHDRAW_REQUEST",
  SUPPORT: "SUPPORT",
  UNKNOWN: "UNKNOWN",
} as const;

export type Intent = (typeof Intent)[keyof typeof Intent];

// Capability level required to fulfil each intent — used by the permission-check step
// in the conversation pipeline (Understand -> Classify -> Check Permission -> ...)
export const IntentCapabilityLevel: Record<Intent, "L1" | "L2" | "L3" | "HANDOFF" | "CLARIFY"> = {
  FAQ: "L1",
  ACCOUNT_INFO: "L2",
  TRANSACTION_STATUS: "L2",
  CREATE_MT5: "L3",
  DEPOSIT_REQUEST: "L3",
  WITHDRAW_REQUEST: "L3",
  SUPPORT: "HANDOFF",
  UNKNOWN: "CLARIFY",
};
