// Source of truth: 05_API_CONTRACT.md §13, 07_ACCEPTANCE_CRITERIA.md AC-23

export interface AuditEventRequest {
  intent: string;
  action: string;
  action_id?: string;
  confirmation?: string; // 'confirmed' | 'not_confirmed'
  step_up?: string;      // 'passed' | 'failed' | 'not_required'
  result: string;       // 'success' | 'error' | 'unknown_result'
  request_reference?: string;
  error_code?: string;
}

export interface AuditEventResponse {
  id: number;
  status: "recorded";
}
