import {
  Component,
  signal,
  inject,
  ElementRef,
  viewChild,
  effect,
  input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/services/auth.service';
import { TradingService } from '../../../../../core/services/trading.service';
import { TransactionService } from '../../../../../core/services/transaction.service';
import { ActionDraftService } from '../../../../../core/services/action-draft.service';
import { SecurityService } from '../../../../../core/services/security.service';
import { SupportService } from '../../../../../core/services/support.service';
import { AgentService } from '../../../../../core/services/agent.service';
import { GuzebotService, GuzebotViewMode } from '../../../../../core/services/guzebot.service';
import type { AccountType } from '@ai-challenge/shared/account-type.types';

export interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  senderName: string;
  avatar?: string;
  text: string;
  time: string;
  chips?: string[];
  suggestHandoff?: boolean;
  interactiveCard?:
    | 'create-mt5'
    | 'deposit'
    | 'withdrawal'
    | 'confirmation'
    | 'otp-stepup'
    | 'support-form'
    | 'receipt';
  receiptData?: {
    title: string;
    reference: string;
    details: string;
    status: string;
  };
}

export type { GuzebotViewMode };

@Component({
  selector: 'app-guzebot-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guzebot-chat.html',
})
export class GuzebotChat implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly guzebotService = inject(GuzebotService);
  protected readonly tradingService = inject(TradingService);
  protected readonly transactionService = inject(TransactionService);
  protected readonly actionDraftService = inject(ActionDraftService);
  protected readonly securityService = inject(SecurityService);
  protected readonly supportService = inject(SupportService);
  protected readonly agentService = inject(AgentService);

  // Allow parent to set default start mode
  readonly initialMode = input<GuzebotViewMode>('modal-welcome');
  readonly isGuest = input<boolean>(false);

  readonly currentMode = this.guzebotService.currentMode;
  readonly userInput = signal<string>('');
  readonly isTyping = signal<boolean>(false);

  // Interactive Flow States (Level 3 Protected Workflows)
  readonly activeFlow = signal<'none' | 'create-mt5' | 'deposit' | 'withdrawal' | 'confirmation' | 'otp' | 'support'>('none');
  readonly currentActionId = signal<string | null>(null);
  readonly currentActionIntent = signal<string | null>(null);
  readonly currentDraftSummary = signal<{ title: string; details: { label: string; value: string }[] } | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly flowErrorMessage = signal<string | null>(null);

  // Form Fields: Create MT5
  readonly accountTypes = signal<AccountType[]>([]);
  readonly selectedAccountTypeId = signal<number>(101);
  readonly selectedLeverage = signal<number>(500);

  // Form Fields: Deposit
  readonly depositWalletId = signal<string>('MAIN-1001');
  readonly depositAmount = signal<number>(500);
  readonly depositMethod = signal<string>('payment_gateway');

  // Form Fields: Withdrawal
  readonly withdrawWalletId = signal<string>('MAIN-1001');
  readonly withdrawAmount = signal<number>(250);
  readonly withdrawDestinationId = signal<string>('BANK-1001-01');

  // Form Fields: Step-Up OTP
  readonly otpValue = signal<string>('123456');

  // Form Fields: Support Ticket
  readonly supportSummary = signal<string>('Need assistance with transaction inquiry');
  readonly supportReason = signal<string>('User requested human support specialist');

  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  readonly quickFaqs = [
    { label: 'Create MT5 Account', query: 'Create MT5 Account' },
    { label: 'Deposit Funds', query: 'Deposit Funds' },
    { label: 'Withdraw Funds', query: 'Withdraw Funds' },
    { label: 'Check Deposit Status', query: 'Check deposit status' },
  ];

  readonly messages = signal<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      senderName: 'Guzebot',
      avatar: 'images/guzebot_avatar.svg',
      text: "Hello! I'm Guzebot, your 24/7 smart brokerage AI assistant. I can help answer trading questions, track your deposits & withdrawals, or safely guide you through creating MT5 accounts, deposits, and withdrawals with multi-tier verification.",
      time: '11:41',
      chips: [
        'Deposit Funds',
        'Create MT5 Account',
        'Withdraw Funds',
        'Check Deposit Status',
      ],
    },
  ]);

  constructor() {
    // Auto-scroll when messages update
    effect(() => {
      this.messages();
      setTimeout(() => {
        const el = this.messagesContainer()?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }, 50);
    });
  }

  ngOnInit() {
    if (this.initialMode()) {
      this.guzebotService.setMode(this.initialMode());
    }
    // Pre-load account types for forms
    this.tradingService.getAccountTypes().subscribe({
      next: (res) => {
        this.accountTypes.set(res.items.filter((at) => at.status === 'active'));
      },
      error: () => {},
    });
  }

  setMode(mode: GuzebotViewMode) {
    this.guzebotService.setMode(mode);
  }

  startChat() {
    this.guzebotService.openChat();
  }

  closeModal() {
    this.guzebotService.minimizeChat();
  }

  toggleChat() {
    this.guzebotService.toggleChat();
  }

  sendQuickFaq(faqQuery: string) {
    this.sendMessage(faqQuery);
  }

  onEnterPress(event: Event) {
    event.preventDefault();
    this.submitMessage();
  }

  submitMessage() {
    const text = this.userInput().trim();
    if (!text) return;
    this.sendMessage(text);
    this.userInput.set('');
  }

  private sendMessage(userText: string) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const user = this.authService.currentUser();
    const displayName = user?.display_name || 'Trader Guest';

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      senderName: displayName,
      text: userText,
      time: timeStr,
    };

    this.messages.update((prev) => [...prev, userMsg]);
    this.isTyping.set(true);

    this.fetchBotResponse(userText);
  }

  private fetchBotResponse(query: string) {
    const isThai = /[\u0E00-\u0E7F]/.test(query);
    const q = query.toLowerCase();

    // 1. Explicit Quick Actions from Action Chips
    if (query === 'Create MT5 Account' || query === 'เปิดบัญชี MT5' || query === 'สร้างบัญชี MT5') {
      if (!this.authService.isAuthenticated()) {
        this.addBotMessage({
          text: isThai
            ? 'การเปิดบัญชี MT5 จำเป็นต้องเข้าสู่ระบบก่อนครับ กรุณา Sign In เข้าสู่ระบบ'
            : 'Please Sign In to your account before opening an MT5 account.',
          chips: isThai
            ? ['ประเภทบัญชีมีอะไรบ้าง?', 'MT5 คืออะไร?']
            : ['What account types are available?', 'What is MT5?'],
        });
        return;
      }

      this.activeFlow.set('create-mt5');
      this.flowErrorMessage.set(null);
      this.addBotMessage({
        text: isThai
          ? 'กรุณาเลือกประเภทบัญชีเทรดและเลเวอเรจที่ต้องการด้านล่างได้เลยครับ:'
          : 'Please select your preferred trading account type and leverage below:',
        interactiveCard: 'create-mt5',
      });
      return;
    }

    if (query === 'Deposit Funds' || query === 'ทำรายการฝากเงิน' || query === 'ฝากเงินเข้ากระเป๋า') {
      if (!this.authService.isAuthenticated()) {
        this.addBotMessage({
          text: isThai
            ? 'การฝากเงินเข้าวอลเล็ตจำเป็นต้องเข้าสู่ระบบก่อนครับ กรุณา Sign In'
            : 'Please Sign In to your account before making a deposit.',
          chips: isThai
            ? ['ประเภทบัญชีมีอะไรบ้าง?', 'MT5 คืออะไร?']
            : ['What account types are available?', 'What is MT5?'],
        });
        return;
      }

      this.activeFlow.set('deposit');
      this.flowErrorMessage.set(null);
      this.addBotMessage({
        text: isThai
          ? 'กรุณาเลือกช่องทางการชำระเงินและระบุจำนวนเงินที่ต้องการฝากด้านล่างครับ:'
          : 'Please select a payment method and enter the deposit amount below:',
        interactiveCard: 'deposit',
      });
      return;
    }

    if (query === 'Withdraw Funds' || query === 'ทำรายการถอนเงิน' || query === 'ถอนเงินออกจากกระเป๋า') {
      if (!this.authService.isAuthenticated()) {
        this.addBotMessage({
          text: isThai
            ? 'การถอนเงินจำเป็นต้องเข้าสู่ระบบก่อนครับ กรุณา Sign In'
            : 'Please Sign In to your account before requesting a withdrawal.',
          chips: isThai
            ? ['ประเภทบัญชีมีอะไรบ้าง?']
            : ['What account types are available?'],
        });
        return;
      }

      this.activeFlow.set('withdrawal');
      this.flowErrorMessage.set(null);
      this.addBotMessage({
        text: isThai
          ? 'กรุณาระบุจำนวนเงินที่ต้องการถอนจากกระเป๋าของคุณด้านล่างครับ:'
          : 'Please enter the amount you wish to withdraw from your wallet below:',
        interactiveCard: 'withdrawal',
      });
      return;
    }

    if (query === 'Contact Human Support' || query === 'ติดต่อเจ้าหน้าที่') {
      this.activeFlow.set('support');
      this.flowErrorMessage.set(null);
      this.addBotMessage({
        text: isThai
          ? 'คุณสามารถกรอกหัวข้อและรายละเอียดเพื่อส่งเรื่องไปยังเจ้าหน้าที่ผู้เชี่ยวชาญได้ด้านล่างครับ:'
          : 'Please provide the inquiry details below to submit a ticket to our support specialist:',
        interactiveCard: 'support-form',
      });
      return;
    }

    // 2. Query Backend AI Intelligence & GPT Engine (Sends original case and unicode message)
    this.agentService.chat(query).subscribe({
      next: (res) => {
        let cardToDisplay: ChatMessage['interactiveCard'];

        if (res.intent === 'CREATE_MT5' && this.authService.isAuthenticated()) {
          this.activeFlow.set('create-mt5');
          cardToDisplay = 'create-mt5';
        } else if (res.intent === 'DEPOSIT_REQUEST' && this.authService.isAuthenticated()) {
          this.activeFlow.set('deposit');
          cardToDisplay = 'deposit';
        } else if (res.intent === 'WITHDRAW_REQUEST' && this.authService.isAuthenticated()) {
          this.activeFlow.set('withdrawal');
          cardToDisplay = 'withdrawal';
        }

        this.addBotMessage({
          text: res.response,
          chips:
            res.chips ||
            (isThai
              ? ['ประเภทบัญชีมีอะไรบ้าง?', 'เปิดบัญชี MT5', 'ทำรายการฝากเงิน']
              : ['What account types are available?', 'Create MT5 Account', 'Deposit Funds']),
          suggestHandoff: res.suggest_handoff,
          interactiveCard: cardToDisplay,
        });
      },
      error: () => {
        this.addBotMessage({
          text: isThai
            ? "สวัสดีครับ! ผม Guzebot ผู้ช่วย AI ประจำ Guze Markets ยินดีช่วยเหลือและตอบคำถามเกี่ยวกับการเทรดครับ"
            : "I'm Guzebot, your 24/7 AI brokerage assistant! How may I assist your trading today?",
          chips: isThai
            ? ['ประเภทบัญชีมีอะไรบ้าง?', 'MT5 คืออะไร?', 'ติดต่อเจ้าหน้าที่']
            : ['What account types are available?', 'Create MT5 Account', 'What is MT5?'],
        });
      },
    });
  }

  // ==========================================
  // Level 3 Protected Actions Handling
  // ==========================================

  // Step 1: Submit MT5 Draft
  submitCreateMT5Draft() {
    this.isSubmitting.set(true);
    this.flowErrorMessage.set(null);

    const payload = {
      account_type_id: this.selectedAccountTypeId(),
      leverage: this.selectedLeverage(),
    };

    this.actionDraftService.createDraft({ intent: 'CREATE_MT5', payload }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.currentActionId.set(res.action_id);
        this.currentActionIntent.set('CREATE_MT5');
        const accTypeName = this.selectedAccountTypeId() === 101 ? 'Core USD' : 'Core Cent';
        this.currentDraftSummary.set({
          title: 'Confirm MT5 Account Creation',
          details: [
            { label: 'Account Type', value: `${accTypeName} (ID: ${this.selectedAccountTypeId()})` },
            { label: 'Leverage', value: `1:${this.selectedLeverage()}` },
            { label: 'Currency', value: this.selectedAccountTypeId() === 101 ? 'USD' : 'USC' },
          ],
        });
        this.activeFlow.set('confirmation');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.flowErrorMessage.set(err.error?.error?.message || 'Failed to create action draft.');
      },
    });
  }

  // Step 1: Submit Deposit Draft
  submitDepositDraft() {
    const amount = Number(this.depositAmount());
    if (!amount || amount <= 0) {
      this.flowErrorMessage.set('Please enter a valid amount greater than 0.');
      return;
    }

    this.isSubmitting.set(true);
    this.flowErrorMessage.set(null);

    const payload = {
      wallet_id: this.depositWalletId(),
      amount: amount,
      currency: 'USD',
      payment_method: this.depositMethod(),
    };

    this.actionDraftService.createDraft({ intent: 'DEPOSIT_REQUEST', payload }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.currentActionId.set(res.action_id);
        this.currentActionIntent.set('DEPOSIT_REQUEST');
        const methodLabel =
          this.depositMethod() === 'payment_gateway'
            ? 'QR Payment Gateway (PromptPay)'
            : 'USDT Crypto Transfer';
        this.currentDraftSummary.set({
          title: 'Confirm Deposit Request',
          details: [
            { label: 'Destination Wallet', value: this.depositWalletId() },
            { label: 'Deposit Amount', value: `$${amount.toLocaleString()} USD` },
            { label: 'Payment Method', value: methodLabel },
          ],
        });
        this.activeFlow.set('confirmation');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.flowErrorMessage.set(err.error?.error?.message || 'Failed to create deposit draft.');
      },
    });
  }

  // Step 1: Submit Withdrawal Draft
  submitWithdrawalDraft() {
    const amount = Number(this.withdrawAmount());
    if (!amount || amount <= 0) {
      this.flowErrorMessage.set('Please enter a valid amount greater than 0.');
      return;
    }

    this.isSubmitting.set(true);
    this.flowErrorMessage.set(null);

    const payload = {
      wallet_id: this.withdrawWalletId(),
      amount: amount,
      currency: 'USD',
      destination_id: this.withdrawDestinationId(),
    };

    this.actionDraftService.createDraft({ intent: 'WITHDRAW_REQUEST', payload }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.currentActionId.set(res.action_id);
        this.currentActionIntent.set('WITHDRAW_REQUEST');
        this.currentDraftSummary.set({
          title: 'Confirm Withdrawal Request',
          details: [
            { label: 'Wallet', value: this.withdrawWalletId() },
            { label: 'Withdraw Amount', value: `$${amount.toLocaleString()} USD` },
            { label: 'Destination', value: 'SCB ****5678' },
          ],
        });
        this.activeFlow.set('confirmation');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.flowErrorMessage.set(err.error?.error?.message || 'Failed to create withdrawal draft.');
      },
    });
  }

  // Step 2: Explicit Confirmation (AC-12)
  confirmAction() {
    const actionId = this.currentActionId();
    if (!actionId) return;

    this.isSubmitting.set(true);
    this.flowErrorMessage.set(null);

    this.actionDraftService.confirmDraft(actionId).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Transition to Step-Up OTP Verification
        this.otpValue.set('123456');
        this.activeFlow.set('otp');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.flowErrorMessage.set(err.error?.error?.message || 'Confirmation failed.');
      },
    });
  }

  // Step 3: Step-Up OTP Verification & Protected Execution (AC-14, AC-15, AC-07, AC-16, AC-17)
  submitOtpAndExecute() {
    const actionId = this.currentActionId();
    const otp = this.otpValue().trim();
    if (!actionId || !otp) {
      this.flowErrorMessage.set('Please enter the 6-digit OTP code.');
      return;
    }

    this.isSubmitting.set(true);
    this.flowErrorMessage.set(null);

    // 1. Verify Step-Up OTP
    this.securityService.verifyOtp({ action_id: actionId, otp }).subscribe({
      next: (otpRes) => {
        if (!otpRes.verified || !otpRes.verification_token) {
          this.isSubmitting.set(false);
          this.flowErrorMessage.set('Invalid OTP code. For this challenge, please enter 123456.');
          return;
        }

        const verificationToken = otpRes.verification_token;
        const intent = this.currentActionIntent();

        // 2. Execute Action
        if (intent === 'CREATE_MT5') {
          this.tradingService
            .createTradingAccount(
              {
                account_type_id: this.selectedAccountTypeId(),
                leverage: this.selectedLeverage(),
              },
              { actionId, stepUpToken: verificationToken },
            )
            .subscribe({
              next: (createRes) => {
                this.isSubmitting.set(false);
                this.activeFlow.set('none');
                this.addBotMessage({
                  text: `🎉 **Success!** Your new MT5 live account **${createRes.account.account_id}** (${createRes.account.account_name}, Leverage 1:${createRes.account.leverage}) is now active!`,
                  chips: ['Check my MT5 accounts', 'Deposit Funds', 'Withdraw Funds'],
                  interactiveCard: 'receipt',
                  receiptData: {
                    title: 'MT5 Trading Account Created',
                    reference: createRes.account.account_id,
                    details: `${createRes.account.account_name} • 1:${createRes.account.leverage} • ${createRes.account.currency}`,
                    status: 'Active',
                  },
                });
              },
              error: (err) => {
                this.isSubmitting.set(false);
                this.flowErrorMessage.set(
                  err.error?.error?.message || 'Failed to create MT5 account. Please try again.',
                );
              },
            });
        } else if (intent === 'DEPOSIT_REQUEST') {
          this.transactionService
            .createDeposit(
              {
                wallet_id: this.depositWalletId(),
                amount: Number(this.depositAmount()),
                currency: 'USD',
                payment_method: this.depositMethod(),
              },
              { actionId, stepUpToken: verificationToken },
            )
            .subscribe({
              next: (depRes) => {
                this.isSubmitting.set(false);
                this.activeFlow.set('none');
                this.addBotMessage({
                  text: `🎉 **Success!** Deposit **${depRes.deposit.deposit_id}** for $${depRes.deposit.amount.toLocaleString()} ${depRes.deposit.currency} has been processed and credited to your wallet!`,
                  chips: ['Create MT5 Account', 'Withdraw Funds', 'Check my MT5 accounts'],
                  interactiveCard: 'receipt',
                  receiptData: {
                    title: 'Deposit Completed',
                    reference: depRes.deposit.deposit_id,
                    details: `$${depRes.deposit.amount.toLocaleString()} ${depRes.deposit.currency} • ${depRes.deposit.payment_method}`,
                    status: 'Approved / Credited',
                  },
                });
              },
              error: (err) => {
                this.isSubmitting.set(false);
                this.flowErrorMessage.set(
                  err.error?.error?.message || 'Failed to process deposit. Please try again.',
                );
              },
            });
        } else if (intent === 'WITHDRAW_REQUEST') {
          this.transactionService
            .createWithdrawal(
              {
                wallet_id: this.withdrawWalletId(),
                amount: Number(this.withdrawAmount()),
                currency: 'USD',
                destination_id: this.withdrawDestinationId(),
              },
              { actionId, stepUpToken: verificationToken },
            )
            .subscribe({
              next: (wdRes) => {
                this.isSubmitting.set(false);
                this.activeFlow.set('none');
                this.addBotMessage({
                  text: `🎉 **Success!** Withdrawal request **${wdRes.withdrawal.withdrawal_id}** for $${wdRes.withdrawal.amount.toLocaleString()} USD has been submitted.`,
                  chips: ['Check withdrawal status', 'Deposit Funds', 'Check deposit status'],
                  interactiveCard: 'receipt',
                  receiptData: {
                    title: 'Withdrawal Request Submitted',
                    reference: wdRes.withdrawal.withdrawal_id,
                    details: `$${wdRes.withdrawal.amount.toLocaleString()} ${wdRes.withdrawal.currency} • SCB ****5678`,
                    status: 'Pending Review',
                  },
                });
              },
              error: (err) => {
                this.isSubmitting.set(false);
                this.flowErrorMessage.set(
                  err.error?.error?.message || 'Failed to process withdrawal. Please try again.',
                );
              },
            });
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.flowErrorMessage.set(err.error?.error?.message || 'OTP verification failed.');
      },
    });
  }

  // Submit Support Ticket (AC-21, PT-20)
  submitSupportTicket() {
    const summary = this.supportSummary().trim();
    const reason = this.supportReason().trim();
    if (!summary || !reason) {
      this.flowErrorMessage.set('Please provide both inquiry summary and reason.');
      return;
    }

    this.isSubmitting.set(true);
    this.flowErrorMessage.set(null);

    this.supportService
      .createTicket({
        intent: 'SUPPORT',
        conversation_summary: summary,
        reason: reason,
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.activeFlow.set('none');
          this.addBotMessage({
            text: `Support ticket **${res.ticket_id}** has been dispatched to our human specialist team. You will receive an update shortly.`,
            chips: ['What is MT5?', 'Create MT5 Account'],
            interactiveCard: 'receipt',
            receiptData: {
              title: 'Support Ticket Dispatched',
              reference: res.ticket_id,
              details: summary,
              status: 'Open',
            },
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.flowErrorMessage.set(err.error?.error?.message || 'Failed to create support ticket.');
        },
      });
  }

  cancelActiveFlow() {
    this.activeFlow.set('none');
    this.currentActionId.set(null);
    this.currentActionIntent.set(null);
    this.currentDraftSummary.set(null);
    this.flowErrorMessage.set(null);
    this.addBotMessage({
      text: 'Action cancelled. How else can I help you?',
      chips: ['Create MT5 Account', 'Withdraw Funds', 'What is MT5?'],
    });
  }

  private addBotMessage(response: {
    text: string;
    chips?: string[];
    suggestHandoff?: boolean;
    interactiveCard?:
      | 'create-mt5'
      | 'deposit'
      | 'withdrawal'
      | 'confirmation'
      | 'otp-stepup'
      | 'support-form'
      | 'receipt';
    receiptData?: {
      title: string;
      reference: string;
      details: string;
      status: string;
    };
  }) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const botMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      senderName: 'Guzebot',
      avatar: 'images/guzebot_avatar.svg',
      text: response.text,
      time: timeStr,
      chips: response.chips,
      suggestHandoff: response.suggestHandoff,
      interactiveCard: response.interactiveCard,
      receiptData: response.receiptData,
    };

    this.messages.update((prev) => [...prev, botMsg]);
    this.isTyping.set(false);
  }

  adjustHeight(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  onKeyDown(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (kbEvent.key === 'Enter' && !kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.submitMessage();
    }
  }
}
