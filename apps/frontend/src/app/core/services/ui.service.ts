import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UiService {
  private router = inject(Router);

  // State for mobile off-canvas sidebar
  readonly isMobileSidebarOpen = signal<boolean>(false);

  constructor() {
    // Automatically close mobile sidebar whenever navigation happens
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMobileSidebar();
      });
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update((prev) => !prev);
  }

  openMobileSidebar(): void {
    this.isMobileSidebarOpen.set(true);
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }
}
