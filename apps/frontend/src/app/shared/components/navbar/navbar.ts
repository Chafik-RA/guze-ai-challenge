import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
})
export class Navbar {
  protected readonly authService = inject(AuthService);
  protected readonly uiService = inject(UiService);
  private readonly router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/sign-in']);
  }
}
