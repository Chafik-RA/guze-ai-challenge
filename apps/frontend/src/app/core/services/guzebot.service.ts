import { Injectable, signal } from '@angular/core';

export type GuzebotViewMode =
  | 'modal-welcome'
  | 'modal-more-info'
  | 'chat-open'
  | 'chat-minimized'
  | 'closed';

@Injectable({
  providedIn: 'root',
})
export class GuzebotService {
  readonly currentMode = signal<GuzebotViewMode>('modal-welcome');

  setMode(mode: GuzebotViewMode) {
    this.currentMode.set(mode);
  }

  openWelcomeModal() {
    this.currentMode.set('modal-welcome');
  }

  openMoreInfo() {
    this.currentMode.set('modal-more-info');
  }

  openChat() {
    this.currentMode.set('chat-open');
  }

  minimizeChat() {
    this.currentMode.set('chat-minimized');
  }

  close() {
    this.currentMode.set('closed');
  }

  toggleChat() {
    if (this.currentMode() === 'chat-open') {
      this.currentMode.set('chat-minimized');
    } else {
      this.currentMode.set('chat-open');
    }
  }
}
