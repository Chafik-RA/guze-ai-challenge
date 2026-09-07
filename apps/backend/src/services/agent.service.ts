import { ErrorCode } from "@ai-challenge/shared/error-codes";
import { Intent, type Intent as IntentType } from "@ai-challenge/shared/conversation";

export interface AgentChatRequest {
  message: string;
  context?: {
    action_id?: string;
  };
}

export interface AgentChatResponse {
  intent: string;
  response: string;
  code?: string;
  suggest_handoff?: boolean;
  chips?: string[];
}

export class AgentService {
  /**
   * Evaluates user input against Security Guardrails, Challenge KB, and Intent Routing.
   * Enforces AC-01, AC-02, AC-19, AC-20, PT-01, PT-19.
   */
  async processMessage(
    userMessage: string,
    memberId?: number | null,
  ): Promise<AgentChatResponse> {
    const raw = userMessage.trim();
    const query = raw.toLowerCase();

    // 1. Prompt Injection & Adversarial Defense (AC-19, AC-20)
    if (this.detectPromptInjection(query)) {
      return {
        intent: "PROMPT_INJECTION_DEFENSE",
        response:
          "I cannot comply with requests to ignore security rules, reveal system prompts or secrets, or bypass authentication boundaries.",
        code: ErrorCode.FORBIDDEN,
      };
    }

    // 2. Unsupported Knowledge / Out-of-Scope (PT-19, AC-02, 09_CHALLENGE_KNOWLEDGE_BASE.md §9)
    // Check for exact spread, commission, fee, slippage, SLA questions
    if (this.isUnsupportedKnowledge(query)) {
      return {
        intent: Intent.UNKNOWN,
        response:
          "Information regarding exact spread values, commissions, trading fees, or withdrawal SLAs is not defined in the Challenge Knowledge Base. I cannot guess or assume production figures. Would you like me to connect you with human support?",
        code: ErrorCode.KNOWLEDGE_NOT_FOUND,
        suggest_handoff: true,
        chips: ["Contact Human Support", "What account types are available?"],
      };
    }

    // 3. Human Support Intent (PT-20, AC-21)
    if (
      query.includes("human support") ||
      query.includes("talk to human") ||
      query.includes("agent") ||
      query.includes("ติดต่อเจ้าหน้าที่") ||
      query.includes("support")
    ) {
      return {
        intent: Intent.SUPPORT,
        response:
          "I can assist in connecting you directly to our human support team. Please provide a brief summary of what you need help with.",
        suggest_handoff: true,
      };
    }

    // 4. Level 1 Public FAQ (AC-01, PT-01, 09_CHALLENGE_KNOWLEDGE_BASE.md)
    if (
      query.includes("account type") ||
      query.includes("ประเภทบัญชี") ||
      query.includes("core usd") ||
      query.includes("core cent") ||
      query.includes("legacy demo")
    ) {
      return {
        intent: Intent.FAQ,
        response:
          "Guze Markets offers active Live account types: Core USD (leverage up to 1:500, max 3 accounts) and Core Cent (leverage up to 1:2000, max 2 accounts). Legacy Demo is currently inactive for new creation.",
        chips: ["What is MT5?", "How do I create MT5 account?"],
      };
    }

    if (query.includes("deposit status") || query.includes("deposit mean") || query.includes("สถานะการฝาก")) {
      return {
        intent: Intent.FAQ,
        response:
          "Deposit statuses include: 'pending' (waiting for processing), 'approve' (completed), 'reject' (declined), 'processing' (in-flight), 'mismatch' (verification required), 'pending_refund' (refund in progress), and 'refunded' (refunded to source).",
        chips: ["What is MT5?", "What is Spread?"],
      };
    }

    if (query.includes("withdrawal status") || query.includes("withdrawal mean") || query.includes("สถานะการถอน")) {
      return {
        intent: Intent.FAQ,
        response:
          "Withdrawal statuses include: 'pending' (awaiting review), 'approve' (successful), 'reject_refund' (rejected with refund), 'pending_approve' (pending authorization), 'pending_reject' (pending decline), 'reject_no_refund' (rejected without refund), and 'initial' (created).",
        chips: ["What is MT5?", "Check deposit status"],
      };
    }

    if (query.includes("mt5") || query.includes("metatrader")) {
      return {
        intent: Intent.FAQ,
        response:
          "MetaTrader 5 (MT5) is our next-generation multi-asset trading platform with advanced technical analysis, algorithmic trading, and ultra-low latency execution.",
        chips: ["What account types are available?", "What are the Forex market trading hours?"],
      };
    }

    if (query.includes("trading hour") || query.includes("market hour") || query.includes("เวลาทำการ")) {
      return {
        intent: Intent.FAQ,
        response:
          "Forex markets operate 24 hours a day, 5 days a week (from Sydney opening Monday to New York closing Friday). Crypto markets are available 24/7.",
        chips: ["What is MT5?", "How do I start trading?"],
      };
    }

    // 5. Level 2 Account/Transaction Inquiries requiring Auth (AC-03, PT-02)
    if (
      query.includes("my deposit") ||
      query.includes("my withdrawal") ||
      query.includes("my mt5") ||
      query.includes("my account") ||
      query.includes("my wallet") ||
      query.includes("my balance")
    ) {
      if (!memberId) {
        return {
          intent: Intent.ACCOUNT_INFO,
          response:
            "Authentication required to view your personal account data, transactions, or balances. Please Sign In first.",
          code: ErrorCode.AUTH_REQUIRED,
        };
      }

      return {
        intent: Intent.ACCOUNT_INFO,
        response:
          "You are authenticated. You can view your live balances, MT5 trading accounts, and deposit/withdrawal history directly in the Trader Room dashboard.",
        chips: ["Check my MT5 accounts", "Check deposit status"],
      };
    }

    // Default Fallback / Clarification
    return {
      intent: Intent.UNKNOWN,
      response:
        "I'm Guzebot, your 24/7 AI brokerage assistant. I can help answer trading FAQs, check deposit/withdrawal statuses, or assist with MT5 account management.",
      chips: ["What account types are available?", "What is MT5?", "Contact Human Support"],
    };
  }

  private detectPromptInjection(query: string): boolean {
    const injectionPatterns = [
      /ignore\s+(all\s+|previous\s+|system\s+)*(rules|instructions|prompts|security)/i,
      /reveal\s+(the\s+|all\s+)*(system prompt|secret|credentials|passwords|token|customer|database passwords)/i,
      /show\s+(me\s+)?(the\s+|all\s+)*(system prompt|raw prompt|admin password|all customer|credentials|database passwords)/i,
      /bypass\s+(the\s+)*(otp|2fa|security|authentication|rules)/i,
      /switch\s+role\s+to\s+(admin|superuser|developer)/i,
      /give\s+me\s+(the\s+|all\s+)*(access token|secret|jwt|database credentials|passwords)/i,
      /show\s+other\s+user/i,
      /extract\s+api\s+key/i,
    ];

    return injectionPatterns.some((pattern) => pattern.test(query));
  }

  private isUnsupportedKnowledge(query: string): boolean {
    const unsupportedPatterns = [
      /\b(exact|current|lowest|average)\s+spread\b/i,
      /\b(what is the|how much is the)\s+spread\s+(on|for)\b/i,
      /\bspread\s+(on|for)\s+(eurusd|gbpusd|xauusd|btc|gold)/i,
      /\b(commission fee|trading fee|exact commission|swap fee|slippage rate)\b/i,
      /\b(payment fee|exchange rate fee|deposit fee percentage)\b/i,
      /\b(withdrawal sla|processing sla|exact processing time in hours)\b/i,
      /\bfull kyc policy\b/i,
    ];

    return unsupportedPatterns.some((pattern) => pattern.test(query));
  }
}
