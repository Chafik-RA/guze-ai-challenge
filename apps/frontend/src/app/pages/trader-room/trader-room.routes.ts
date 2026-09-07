import { Routes } from '@angular/router';

export const TRADER_ROOM_ROUTES: Routes = [
  { path: '', redirectTo: 'guzebot', pathMatch: 'full' },
  {
    path: 'guzebot',
    loadComponent: () => import('../trader-room/guzebot/guzebot').then((m) => m.Guzebot),
  },
];
