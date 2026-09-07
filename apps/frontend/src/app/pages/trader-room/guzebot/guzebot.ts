import { Component, inject, signal } from '@angular/core';
import { GuzebotService } from '../../../core/services/guzebot.service';

@Component({
  selector: 'app-guzebot',
  imports: [],
  templateUrl: './guzebot.html',
})
export class Guzebot {
  protected readonly guzebotService = inject(GuzebotService);

  readonly activeNav = signal<string>('guzebot');

  openMoreInfo() {
    this.guzebotService.openMoreInfo();
  }

  openWelcomeModal() {
    this.guzebotService.openWelcomeModal();
  }

  openChat() {
    this.guzebotService.openChat();
  }

  setActiveNav(nav: string) {
    this.activeNav.set(nav);
    if (nav === 'guzebot') {
      this.guzebotService.minimizeChat();
    }
  }
}
