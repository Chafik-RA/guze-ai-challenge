import { Routes } from '@angular/router';
import { Pages } from './pages/pages';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    component: Pages,
    children: [
      // --- Public Routes ---
      {
        path: 'sign-in',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/sign-in/sign-in').then((m) => m.SignIn),
      },

      // --- Protected Routes (ต้อง Login เท่านั้น) ---
      {
        path: '',
        canActivate: [authGuard],
        canActivateChild: [authGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/trader-room/trader-room').then((m) => m.TraderRoom),
            loadChildren: () =>
              import('./pages/trader-room/trader-room.routes').then((m) => m.TRADER_ROOM_ROUTES),
          },
        ],
      },
    ],
  },

  // --- Wildcard (Fallback to Home) ---
  {
    path: '**',
    redirectTo: '',
  },
];
