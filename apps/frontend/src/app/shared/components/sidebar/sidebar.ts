import { Component, inject, signal, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { MENU_DATA, MenuGroupType } from './menu';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly uiService = inject(UiService);
  private readonly router = inject(Router);

  readonly allMenuItems = signal<MenuGroupType[]>(MENU_DATA);

  // เก็บ State เมนูย่อยที่กำลังเปิดอยู่
  readonly openSubmenus = signal<Set<string>>(new Set(['social-trade', 'transactions']));

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.fetchProfile().subscribe({
        error: () => {
          // Token might be expired, auth interceptor will handle if 401
        },
      });
    }
  }

  toggleSubmenu(key: string): void {
    const current = new Set(this.openSubmenus());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.openSubmenus.set(current);
  }

  isSubmenuOpen(key: string): boolean {
    return this.openSubmenus().has(key);
  }

  onLinkClick(): void {
    this.uiService.closeMobileSidebar();
  }

  onButtonClick(key: string): void {
    if (key === 'logout') {
      this.uiService.closeMobileSidebar();
      this.authService.logout();
      this.router.navigate(['/sign-in']);
    }
  }
}
