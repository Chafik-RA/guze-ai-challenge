import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ErrorCode } from "@ai-challenge/shared/error-codes";
import { Intent, type Intent as IntentType } from "@ai-challenge/shared/conversation";

function getOpenAIApiKey(): string | undefined {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "") {
    return process.env.OPENAI_API_KEY.trim();
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, "../../../..", ".env"), // /app/.env (from src/services)
    path.resolve(currentDir, "../../..", ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), ".env"),
    "/app/.env",
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      if (parsed.OPENAI_API_KEY && parsed.OPENAI_API_KEY.trim() !== "") {
        process.env.OPENAI_API_KEY = parsed.OPENAI_API_KEY.trim();
        if (parsed.OPENAI_MODEL) process.env.OPENAI_MODEL = parsed.OPENAI_MODEL.trim();
        if (parsed.OPENAI_BASE_URL) process.env.OPENAI_BASE_URL = parsed.OPENAI_BASE_URL.trim();
        return parsed.OPENAI_API_KEY.trim();
      }
    }
  }

  return undefined;
}

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
   * Connects to OpenAI GPT if OPENAI_API_KEY is provided, with seamless fallback.
   */
  async processMessage(
    userMessage: string,
    memberId?: number | null,
  ): Promise<AgentChatResponse> {
    const raw = userMessage.trim();
    const query = raw.toLowerCase();

    // 1. Layer 1: Prompt Injection & Adversarial Defense (AC-19, AC-20)
    if (this.detectPromptInjection(query)) {
      return {
        intent: "PROMPT_INJECTION_DEFENSE",
        response:
          "I cannot comply with requests to ignore security rules, reveal system prompts or secrets, or bypass authentication boundaries.",
        code: ErrorCode.FORBIDDEN,
      };
    }

    // 2. Layer 1.5: Strict Unsupported Out-of-Scope Knowledge (PT-19, AC-02)
    if (this.isUnsupportedKnowledge(query)) {
      const isThai = /[\u0E00-\u0E7F]/.test(raw);
      return {
        intent: Intent.UNKNOWN,
        response: isThai
          ? "ข้อมูลเกี่ยวกับค่าสเปรด (Spread) เจาะจงรายคู่เงิน ค่าคอมมิชชั่น ค่าธรรมเนียม หรือระยะเวลา SLA ไม่ได้ถูกกำหนดไว้ในฐานข้อมูลมาตรฐานของ Challenge (not defined in the Challenge Knowledge Base) จึงไม่สามารถระบุตัวเลขได้ครับ ต้องการให้เชื่อมต่อกับเจ้าหน้าที่ฝ่ายบริการลูกค้า (Human Support) หรือไม่ครับ?"
          : "Information regarding exact spread values, commissions, trading fees, or withdrawal SLAs is not defined in the Challenge Knowledge Base. I cannot guess or assume production figures. Would you like me to connect you with human support?",
        code: ErrorCode.KNOWLEDGE_NOT_FOUND,
        suggest_handoff: true,
        chips: isThai
          ? ["ติดต่อเจ้าหน้าที่", "ประเภทบัญชีมีอะไรบ้าง?"]
          : ["Contact Human Support", "What account types are available?"],
      };
    }

    // 3. Layer 2: OpenAI GPT Intelligence (dynamically loads from .env)
    const apiKey = getOpenAIApiKey();
    if (apiKey && apiKey !== "") {
      try {
        console.log(`[INFO] Calling OpenAI GPT (${process.env.OPENAI_MODEL || "gpt-5.4-mini"})...`);
        const gptResponse = await this.queryOpenAIGPT(raw, memberId, apiKey);
        if (gptResponse) {
          console.log("[INFO] OpenAI GPT Response successfully received:", gptResponse.intent);
          return gptResponse;
        }
      } catch (err: any) {
        console.warn("[WARN] OpenAI GPT API call failed, falling back to Knowledge Base Engine:", err?.message || err);
      }
    } else {
      console.log("[INFO] No OPENAI_API_KEY detected in .env, using built-in Challenge Knowledge Base Engine.");
    }

    // 3. Layer 3: Built-in Deterministic Challenge Knowledge Base Engine
    return this.processDeterministicFallback(raw, query, memberId);
  }

  private async queryOpenAIGPT(
    userMessage: string,
    memberId: number | null | undefined,
    apiKey: string,
  ): Promise<AgentChatResponse | null> {
    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

    const systemPrompt = `You are Guzebot, the 24/7 AI Brokerage Assistant for Guze Markets (Challenge 2026).
Your role is to assist traders politely, accurately, and securely with brokerage FAQs, trading platform questions, and account workflows.

[CHALLENGE KNOWLEDGE BASE FACTS]:
- Active Live Account Types:
  1. Core USD: Leverage up to 1:500, max limit 3 accounts per member, minimum deposit 10 USD, base currency USD.
  2. Core Cent: Leverage up to 1:2000, max limit 2 accounts per member, minimum deposit 10 USD, base currency USC.
  3. Legacy Demo: Inactive for new account creation.
- Deposit Statuses (Trader-Friendly Meanings):
  - Pending (รอดำเนินการ): คำขอฝากเงินอยู่ในคิวรอการตรวจสอบ
  - Approved (อนุมัติสำเร็จ): รายการฝากเงินสำเร็จเรียบร้อย ยอดเงินเข้ากระเป๋าหลัก (Wallet) แล้ว
  - Processing (กำลังประมวลผล): รายการฝากเงินกำลังดำเนินการส่งคำขอกับระบบธนาคาร/เกตเวย์
  - Rejected (ปฏิเสธ): คำขอฝากเงินไม่ผ่านการอนุมัติ (เช่น ข้อมูลไม่ถูกต้อง)
  - Mismatch (ข้อมูลไม่ตรงกัน): ยอดเงินหรือสลิปไม่ตรงกับข้อมูลที่แจ้ง กรุณาตรวจสอบหรือส่งหลักฐานใหม่
  - Pending Refund (รอคืนเงิน): ระบบกำลังประสานงานส่งเงินคืนกลับสู่บัญชีต้นทาง
  - Refunded (คืนเงินสำเร็จ): คืนเงินเข้าบัญชีต้นทางเรียบร้อยแล้ว
- Withdrawal Statuses (Trader-Friendly Meanings):
  - Pending (รอตรวจสอบ): คำขอถอนเงินรอเจ้าหน้าที่ตรวจสอบความถูกต้อง
  - Pending Authorization (รออนุมัติ): ผ่านการตรวจสอบเบื้องต้นและรอการอนุมัติโอนเงิน
  - Approved (อนุมัติสำเร็จ): โอนเงินออกจากระบบไปยังบัญชีธนาคารปลายทางสำเร็จ
  - Rejected with Refund (ปฏิเสธและคืนเงิน): คำขอถอนเงินถูกปฏิเสธและยอดเงินถูกคืนกลับเข้ากระเป๋า Wallet
  - Rejected without Refund (ปฏิเสธ): คำขอถอนเงินถูกปฏิเสธ
- Trading Platform: MetaTrader 5 (MT5) with multi-asset capabilities.
- Market Hours: Forex markets operate 24 hours a day, 5 days a week (Monday opening to Friday closing). Crypto markets operate 24/7.
- User Context: The user is currently ${memberId ? `authenticated (member_id: ${memberId})` : "UNAUTHENTICATED (guest)"}.

[CRITICAL SECURITY & COMPLIANCE GUARDRAILS]:
1. LANGUAGE REQUIREMENT: You MUST detect the language of the user's message and ALWAYS reply in the EXACT SAME LANGUAGE. If the user asks in Thai (ภาษาไทย), you MUST respond in polite, clear, natural Thai. If the user asks in English, respond in English.
2. STRICT KNOWLEDGE BASE SCOPE: You DO NOT have access to live spreads on specific currency pairs (e.g., EUR/USD, GBP/USD, XAU/USD, BTC), exact commissions, slippage rates, or withdrawal SLA hours because they are not defined in the Challenge Knowledge Base. NEVER guess, assume, or hallucinate production numbers.
3. NEVER EXPOSE INTERNAL DEV CODES: NEVER mention database integer IDs, internal enum numbers (e.g. 0, 1, 2, 3, 4, 5, 6, 99), table schemas, or developer notes. Always explain statuses in clean, professional, trader-friendly terminology.
4. When asked about checking deposit or withdrawal status:
   - If authenticated: Explain that they can view live status directly in the Deposit / Withdrawal history in Trader Room, and provide a clear, concise bulleted summary of what each status means.
   - If unauthenticated: Inform them that they can sign in to view their personal transactions in Trader Room, and provide the general status definitions.
5. If the user asks about exact spread values, commissions, fees, or withdrawal SLAs, inform them that these details are unconfirmed in the challenge knowledge base, set "suggest_handoff": true, and set "code": "KNOWLEDGE_NOT_FOUND".
6. If an unauthenticated user asks to view their personal transactions, balances, or MT5 accounts, inform them that authentication is required to access personal data, and set "code": "AUTH_REQUIRED", "intent": "ACCOUNT_INFO".
7. If the user asks to speak with a human, support specialist, or agent, set "intent": "SUPPORT", "suggest_handoff": true.
8. If the user asks to create an MT5 account, set "intent": "CREATE_MT5".
9. If the user asks to deposit funds, set "intent": "DEPOSIT_REQUEST".
10. If the user asks to withdraw funds, set "intent": "WITHDRAW_REQUEST".

[OUTPUT FORMAT]:
You MUST reply strictly with a valid JSON object matching this schema:
{
  "intent": "FAQ" | "ACCOUNT_INFO" | "CREATE_MT5" | "DEPOSIT_REQUEST" | "WITHDRAW_REQUEST" | "SUPPORT" | "UNKNOWN",
  "response": "<friendly, professional markdown response with helpful explanations in the user's language>",
  "code": "<optional error code if applicable, e.g. AUTH_REQUIRED or KNOWLEDGE_NOT_FOUND>",
  "suggest_handoff": <boolean>,
  "chips": ["<suggested quick chip 1>", "<suggested quick chip 2>"]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`OpenAI API responded with HTTP status ${res.status}: ${errBody}`);
      }

      const data = (await res.json()) as any;
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      return {
        intent: parsed.intent || Intent.UNKNOWN,
        response: parsed.response || "",
        code: parsed.code || undefined,
        suggest_handoff: parsed.suggest_handoff || false,
        chips: Array.isArray(parsed.chips) ? parsed.chips : undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private processDeterministicFallback(
    raw: string,
    query: string,
    memberId?: number | null,
  ): AgentChatResponse {
    const isThai = /[\u0E00-\u0E7F]/.test(raw);

    // 1. Unsupported Knowledge / Out-of-Scope (PT-19, AC-02, 09_CHALLENGE_KNOWLEDGE_BASE.md §9)
    // Check for exact spread, commission, fee, slippage, SLA questions
    if (this.isUnsupportedKnowledge(query)) {
      return {
        intent: Intent.UNKNOWN,
        response: isThai
          ? "ข้อมูลเกี่ยวกับค่าสเปรด (Spread) เจาะจงรายคู่เงิน ค่าคอมมิชชั่น ค่าธรรมเนียม หรือระยะเวลา SLA ไม่ได้ถูกกำหนดไว้ในฐานข้อมูลมาตรฐานของ Challenge จึงไม่สามารถระบุตัวเลขได้ครับ ต้องการให้เชื่อมต่อกับเจ้าหน้าที่ฝ่ายบริการลูกค้า (Human Support) หรือไม่ครับ?"
          : "Information regarding exact spread values, commissions, trading fees, or withdrawal SLAs is not defined in the Challenge Knowledge Base. I cannot guess or assume production figures. Would you like me to connect you with human support?",
        code: ErrorCode.KNOWLEDGE_NOT_FOUND,
        suggest_handoff: true,
        chips: isThai
          ? ["ติดต่อเจ้าหน้าที่", "ประเภทบัญชีมีอะไรบ้าง?"]
          : ["Contact Human Support", "What account types are available?"],
      };
    }

    // 2. Human Support Intent (PT-20, AC-21)
    if (
      query.includes("human support") ||
      query.includes("talk to human") ||
      query.includes("agent") ||
      query.includes("ติดต่อเจ้าหน้าที่") ||
      query.includes("support")
    ) {
      return {
        intent: Intent.SUPPORT,
        response: isThai
          ? "ผมสามารถช่วยเชื่อมต่อคุณกับทีมงานเจ้าหน้าที่ผู้เชี่ยวชาญได้ครับ กรุณาระบุรายละเอียดหรือหัวข้อที่ต้องการความช่วยเหลือได้เลยครับ"
          : "I can assist in connecting you directly to our human support team. Please provide a brief summary of what you need help with.",
        suggest_handoff: true,
      };
    }

    // 3. Level 1 Public FAQ (AC-01, PT-01, 09_CHALLENGE_KNOWLEDGE_BASE.md)
    if (
      query.includes("account type") ||
      query.includes("ประเภทบัญชี") ||
      query.includes("core usd") ||
      query.includes("core cent") ||
      query.includes("legacy demo")
    ) {
      return {
        intent: Intent.FAQ,
        response: isThai
          ? "Guze Markets ให้บริการประเภทบัญชีเทรด Live 2 รูปแบบ ได้แก่ Core USD (เลเวอเรจสูงสุด 1:500 จำกัดสูงสุด 3 บัญชี) และ Core Cent (เลเวอเรจสูงสุด 1:2000 จำกัดสูงสุด 2 บัญชี) ครับ ส่วนบัญชี Legacy Demo ปัจจุบันไม่เปิดให้สร้างใหม่แล้วครับ"
          : "Guze Markets offers active Live account types: Core USD (leverage up to 1:500, max 3 accounts) and Core Cent (leverage up to 1:2000, max 2 accounts). Legacy Demo is currently inactive for new creation.",
        chips: isThai
          ? ["MT5 คืออะไร?", "เปิดบัญชี MT5 ทำอย่างไร?"]
          : ["What is MT5?", "How do I create MT5 account?"],
      };
    }

    if (
      query.includes("deposit status") ||
      query.includes("deposit mean") ||
      query.includes("สถานะการฝาก") ||
      query.includes("ฝากเงินยังไง")
    ) {
      return {
        intent: Intent.FAQ,
        response: isThai
          ? "สถานะการฝากเงินในระบบประกอบด้วย: 'pending' (รอตรวจสอบ), 'approve' (อนุมัติสำเร็จ), 'reject' (ปฏิเสธ), 'processing' (กำลังดำเนินการ), 'mismatch' (ข้อมูลไม่ตรงกัน), 'pending_refund' (รอคืนเงิน) และ 'refunded' (คืนเงินสำเร็จแล้ว) ครับ"
          : "Deposit statuses include: 'pending' (waiting for processing), 'approve' (completed), 'reject' (declined), 'processing' (in-flight), 'mismatch' (verification required), 'pending_refund' (refund in progress), and 'refunded' (refunded to source).",
        chips: isThai ? ["MT5 คืออะไร?", "ทำรายการฝากเงิน"] : ["What is MT5?", "Deposit Funds"],
      };
    }

    if (
      query.includes("withdrawal status") ||
      query.includes("withdrawal mean") ||
      query.includes("สถานะการถอน") ||
      query.includes("ถอนเงินยังไง")
    ) {
      return {
        intent: Intent.FAQ,
        response: isThai
          ? "สถานะการถอนเงินในระบบประกอบด้วย: 'pending' (รอตรวจสอบ), 'approve' (อนุมัติสำเร็จ), 'reject_refund' (ปฏิเสธและคืนเงินเข้ากระเป๋า), 'pending_approve' (รออนุมัติ) และ 'reject_no_refund' (ปฏิเสธโดยไม่คืนเงิน) ครับ"
          : "Withdrawal statuses include: 'pending' (awaiting review), 'approve' (successful), 'reject_refund' (rejected with refund), 'pending_approve' (pending authorization), 'pending_reject' (pending decline), 'reject_no_refund' (rejected without refund), and 'initial' (created).",
        chips: isThai ? ["MT5 คืออะไร?", "ทำรายการถอนเงิน"] : ["What is MT5?", "Withdraw Funds"],
      };
    }

    if (query.includes("mt5") || query.includes("metatrader")) {
      return {
        intent: Intent.FAQ,
        response: isThai
          ? "MetaTrader 5 (MT5) คือแพลตฟอร์มการซื้อขายหลายสินทรัพย์รุ่นใหม่ที่มีเครื่องมือวิเคราะห์กราฟเทคนิคขั้นสูง รองรับระบบเทรดอัตโนมัติ (EA) และมีความเร็วในการส่งคำสั่งระดับสูงครับ"
          : "MetaTrader 5 (MT5) is our next-generation multi-asset trading platform with advanced technical analysis, algorithmic trading, and ultra-low latency execution.",
        chips: isThai
          ? ["ประเภทบัญชีมีอะไรบ้าง?", "เวลาทำการตลาด Forex?"]
          : ["What account types are available?", "What are the Forex market trading hours?"],
      };
    }

    if (query.includes("trading hour") || query.includes("market hour") || query.includes("เวลาทำการ") || query.includes("ตลาดเปิด")) {
      return {
        intent: Intent.FAQ,
        response: isThai
          ? "ตลาด Forex เปิดทำการ 24 ชั่วโมงต่อวัน 5 วันต่อสัปดาห์ (ตั้งแต่เปิดตลาดเช้าวันจันทร์ถึงปิดตลาดคืนวันศุกร์) ส่วนตลาด Cryptocurrency เปิดให้บริการตลอด 24 ชั่วโมง 7 วันครับ"
          : "Forex markets operate 24 hours a day, 5 days a week (from Sydney opening Monday to New York closing Friday). Crypto markets are available 24/7.",
        chips: isThai ? ["MT5 คืออะไร?", "เริ่มต้นเทรดอย่างไร?"] : ["What is MT5?", "How do I start trading?"],
      };
    }

    // 4. Level 2 Account/Transaction Inquiries requiring Auth (AC-03, PT-02)
    if (
      query.includes("my deposit") ||
      query.includes("my withdrawal") ||
      query.includes("my mt5") ||
      query.includes("my account") ||
      query.includes("my wallet") ||
      query.includes("my balance") ||
      query.includes("กระเป๋าของฉัน") ||
      query.includes("ยอดเงินของฉัน") ||
      query.includes("บัญชีของฉัน")
    ) {
      if (!memberId) {
        return {
          intent: Intent.ACCOUNT_INFO,
          response: isThai
            ? "การตรวจสอบข้อมูลบัญชี ธุรกรรม หรือยอดเงินส่วนตัว จำเป็นต้องเข้าสู่ระบบก่อนครับ กรุณาเข้าสู่ระบบ (Sign In)"
            : "Authentication required to view your personal account data, transactions, or balances. Please Sign In first.",
          code: ErrorCode.AUTH_REQUIRED,
        };
      }

      return {
        intent: Intent.ACCOUNT_INFO,
        response: isThai
          ? "คุณได้เข้าสู่ระบบแล้ว สามารถดูยอดเงินคงเหลือ บัญชีเทรด MT5 และประวัติการฝากถอนได้โดยตรงบนแดชบอร์ด Trader Room ครับ"
          : "You are authenticated. You can view your live balances, MT5 trading accounts, and deposit/withdrawal history directly in the Trader Room dashboard.",
        chips: isThai ? ["ดูบัญชี MT5 ของฉัน", "ตรวจสอบสถานะการฝาก"] : ["Check my MT5 accounts", "Check deposit status"],
      };
    }

    // Default Fallback / Clarification
    return {
      intent: Intent.UNKNOWN,
      response: isThai
        ? "สวัสดีครับ! ผม Guzebot ผู้ช่วย AI อัจฉริยะประจำ Guze Markets สามารถสอบถามข้อมูลเกี่ยวกับการเทรด ประเภทบัญชี การฝากถอนเงิน หรือการเปิดบัญชี MT5 ได้ตลอด 24 ชม. ครับ"
        : "I'm Guzebot, your 24/7 AI brokerage assistant. I can help answer trading FAQs, check deposit/withdrawal statuses, or assist with MT5 account management.",
      chips: isThai
        ? ["ประเภทบัญชีมีอะไรบ้าง?", "MT5 คืออะไร?", "ติดต่อเจ้าหน้าที่"]
        : ["What account types are available?", "What is MT5?", "Contact Human Support"],
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
