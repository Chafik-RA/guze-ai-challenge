import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GuzebotChat } from '../trader-room/guzebot/components/guzebot-chat/guzebot-chat';


@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule, GuzebotChat],
  templateUrl: './sign-in.html',
})
export class SignIn {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form states
  email = signal<string>('alice@example.test');
  password = signal<string>('Challenge123!');
  keepSignedIn = signal<boolean>(true);
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  activeTab = signal<'signin' | 'create'>('signin');

  toggleShowPassword() {
    this.showPassword.update((val) => !val);
  }

  toggleKeepSignedIn() {
    this.keepSignedIn.update((val) => !val);
  }

  setTab(tab: 'signin' | 'create') {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  onSubmit() {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please enter both email/username and password');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService
      .login({
        email: this.email().trim(),
        password: this.password(),
      })
      .subscribe({
        next: (_res) => {
          this.isLoading.set(false);
          // Redirect to trader room or chat
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 401) {
            this.errorMessage.set('Invalid email or password. Please try again.');
          } else {
            this.errorMessage.set(
              err.error?.error?.message || 'Unable to connect to server. Please try again.',
            );
          }
        },
      });
  }

  // Quick fill helper for testing
  fillUser(email: string) {
    this.email.set(email);
    this.password.set('Challenge123!');
    this.errorMessage.set(null);
  }
}
