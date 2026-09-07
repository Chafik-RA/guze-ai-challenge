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
import { GuzebotService, GuzebotViewMode } from '../../../../../core/services/guzebot.service';

export interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  senderName: string;
  avatar?: string;
  text: string;
  time: string;
  chips?: string[];
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

  // Allow parent to set default start mode (e.g. 'modal-welcome' on trader-room, 'chat-minimized' on sign-in)
  readonly initialMode = input<GuzebotViewMode>('modal-welcome');
  readonly isGuest = input<boolean>(false);

  readonly currentMode = this.guzebotService.currentMode;
  readonly userInput = signal<string>('');
  readonly isTyping = signal<boolean>(false);

  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  readonly quickFaqs = [
    { label: 'What is MT5?', query: 'What is MT5?' },
    { label: 'What is Spread?', query: 'What is Spread?' },
    {
      label: 'What are the Forex market trading hours?',
      query: 'What are the Forex market trading hours?',
    },
    { label: 'How do I start trading?', query: 'How do I start trading?' },
  ];

  readonly messages = signal<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      senderName: 'Guzebot',
      avatar: 'images/guzebot_avatar.svg',
      text: 'That’s awesome, I think our users will really appreciate the improvements.',
      time: '11:41',
      chips: [
        'What is MT5?',
        'What is Spread?',
        'What are the Forex market trading hours?',
        'How do I start trading?',
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
    const q = query.toLowerCase();

    // 1. Check MT5 accounts (Live API)
    if (q.includes('my mt5') || q.includes('my accounts') || q.includes('trading accounts') || q.includes('บัญชีของฉัน')) {
      if (!this.authService.isAuthenticated()) {
        this.addBotMessage({
          text: 'Checking your MT5 accounts requires authentication. Please Sign In first.',
          chips: ['What is MT5?', 'What is Spread?'],
        });
        return;
      }

      this.tradingService.getTradingAccounts().subscribe({
        next: (res) => {
          if (res.items && res.items.length > 0) {
            const list = res.items
              .map((acc) => `• **Account ${acc.account_id}**: ${acc.account_name} (${acc.currency}, Leverage 1:${acc.leverage}) — *${acc.status}*`)
              .join('\n');
            this.addBotMessage({
              text: `Here are your connected MT5 trading accounts:\n\n${list}`,
              chips: ['Check deposit status', 'Check withdrawal status'],
            });
          } else {
            this.addBotMessage({
              text: 'You do not have any MT5 accounts created yet. You can create a new Core USD or Core Cent account anytime!',
              chips: ['How do I create MT5 account?', 'What account types are available?'],
            });
          }
        },
        error: () => {
          this.addBotMessage({
            text: 'Unable to retrieve MT5 accounts right now. Please try again later.',
          });
        },
      });
      return;
    }

    // 2. Check Deposit Status (Live API)
    if (q.includes('deposit') || q.includes('ฝากเงิน')) {
      if (!this.authService.isAuthenticated()) {
        this.addBotMessage({
          text: 'Checking personalized deposit records requires authentication. Please Sign In to view your wallet transactions.',
          chips: ['What is MT5?'],
        });
        return;
      }

      this.transactionService.getDeposits().subscribe({
        next: (res) => {
          if (res.items && res.items.length > 0) {
            const list = res.items
              .slice(0, 3)
              .map((d) => `• **${d.deposit_id}**: ${d.amount.toLocaleString()} ${d.currency} — Status: \`${d.status}\` (${d.payment_method})`)
              .join('\n');
            this.addBotMessage({
              text: `Here are your latest deposit transactions:\n\n${list}`,
              chips: ['Check withdrawal status', 'Check my MT5 accounts'],
            });
          } else {
            this.addBotMessage({
              text: 'No deposit transactions found in your account history.',
              chips: ['How do I start trading?'],
            });
          }
        },
        error: () => {
          this.addBotMessage({
            text: 'Unable to load deposit records at this time.',
          });
        },
      });
      return;
    }

    // 3. Check Withdrawal Status (Live API)
    if (q.includes('withdraw') || q.includes('ถอนเงิน')) {
      if (!this.authService.isAuthenticated()) {
        this.addBotMessage({
          text: 'Checking withdrawal transactions requires authentication. Please Sign In first.',
        });
        return;
      }

      this.transactionService.getWithdrawals().subscribe({
        next: (res) => {
          if (res.items && res.items.length > 0) {
            const list = res.items
              .slice(0, 3)
              .map((w) => `• **${w.withdrawal_id}**: ${w.amount.toLocaleString()} ${w.currency} — Status: \`${w.status}\` (To: ${w.destination_masked || 'Bank'})`)
              .join('\n');
            this.addBotMessage({
              text: `Here are your recent withdrawal records:\n\n${list}`,
              chips: ['Check deposit status', 'Check my MT5 accounts'],
            });
          } else {
            this.addBotMessage({
              text: 'No withdrawal transactions found in your history.',
            });
          }
        },
        error: () => {
          this.addBotMessage({
            text: 'Unable to fetch withdrawal records at this time.',
          });
        },
      });
      return;
    }

    // 4. Account Types (Live API)
    if (q.includes('account type') || q.includes('ประเภทบัญชี') || q.includes('core usd') || q.includes('core cent')) {
      this.tradingService.getAccountTypes().subscribe({
        next: (res) => {
          const list = res.items
            .filter((at) => at.status === 'active')
            .map((at) => `• **${at.account_name}** (${at.currency}) — Leverage up to 1:${Math.max(...at.leverages)}, Limit: ${at.account_limit} accounts`)
            .join('\n');
          this.addBotMessage({
            text: `Guze Markets offers the following active account types:\n\n${list}\n\nAll live accounts are protected by multi-tier risk management.`,
            chips: ['Check my MT5 accounts', 'What is Spread?'],
          });
        },
        error: () => {
          this.addBotMessage({
            text: 'MetaTrader 5 (MT5) is available with Core USD (max 1:500 leverage) and Core Cent (max 1:2000 leverage).',
            chips: ['What is MT5?', 'What is Spread?'],
          });
        },
      });
      return;
    }

    // 5. General FAQs (Simulated KB)
    setTimeout(() => {
      if (q.includes('mt5')) {
        this.addBotMessage({
          text: 'MetaTrader 5 (MT5) is our next-generation trading platform with advanced charting, automated trading, and ultra-low latency execution.',
          chips: ['What account types are available?', 'What is Spread?'],
        });
        return;
      }

      if (q.includes('spread')) {
        this.addBotMessage({
          text: 'Spread is the difference between the Bid (sell) and Ask (buy) price. Guze Markets offers competitive tight spreads across major currency pairs and crypto assets.',
          chips: ['What is MT5?', 'What are the Forex market trading hours?'],
        });
        return;
      }

      if (q.includes('trading hours') || q.includes('hours') || q.includes('forex market')) {
        this.addBotMessage({
          text: 'Forex markets operate 24/5 from Sydney opening Monday morning to New York closing Friday evening. Crypto trading is available 24/7!',
          chips: ['How do I start trading?', 'What is MT5?'],
        });
        return;
      }

      if (q.includes('start trading') || q.includes('how do i start')) {
        this.addBotMessage({
          text: 'To begin trading: 1) Verify your identity, 2) Create an MT5 live account, 3) Deposit funds to your wallet, and 4) Connect MT5 to start executing trades!',
          chips: ['What account types are available?', 'Check deposit status'],
        });
        return;
      }

      // Default Fallback
      this.addBotMessage({
        text: "I'm Guzebot, your 24/7 smart AI brokerage assistant! I can help you with trading conditions, deposit/withdrawal tracking, MT5 account management, and market FAQs.",
        chips: ['What is MT5?', 'What is Spread?', 'Check deposit status'],
      });
    }, 500);
  }

  private addBotMessage(response: { text: string; chips?: string[] }) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const botMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      senderName: 'Guzebot',
      avatar: 'images/guzebot_avatar.svg',
      text: response.text,
      time: timeStr,
      chips: response.chips,
    };

    this.messages.update((prev) => [...prev, botMsg]);
    this.isTyping.set(false);
  }

  adjustHeight(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto'; // Reset ความสูงก่อนคำนวณ
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  onKeyDown(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (kbEvent.key === 'Enter' && !kbEvent.shiftKey) {
      kbEvent.preventDefault(); // ป้องกันการขึ้นบรรทัดใหม่เมื่อกด Enter ปกติ
      this.submitMessage();
    }
  }
}
