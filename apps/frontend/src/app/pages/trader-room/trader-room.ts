import { Component, signal, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GuzebotChat } from './guzebot/components/guzebot-chat/guzebot-chat';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { RouteFadeOutlet } from '../routefade';

@Component({
  selector: 'app-trader-room',
  standalone: true,
  imports: [CommonModule, GuzebotChat, Sidebar, Navbar, RouteFadeOutlet],
  templateUrl: './trader-room.html',
})
export class TraderRoom {}
