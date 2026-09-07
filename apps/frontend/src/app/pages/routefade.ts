import { Component, input, ChangeDetectorRef, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'route-fade-outlet',
  standalone: true,
  imports: [CommonModule, RouterModule],
  host: {
    class: 'flex flex-col flex-1 w-full h-full min-h-0',
  },
  template: `
    <div
      [class]="containerClass()"
      [@routeFade]="{
        value: outlet.isActivated ? outlet.activatedRoute : 'initial',
        params: { duration: duration(), easing: easing() },
      }"
    >
      <router-outlet #outlet="outlet"></router-outlet>
    </div>
  `,
  animations: [
    trigger('routeFade', [
      transition(
        '* <=> *',
        [style({ opacity: 0 }), animate('{{duration}} {{easing}}', style({ opacity: 1 }))],
        { params: { duration: '500ms', easing: 'ease-out' } },
      ),
    ]),
  ],
})
export class RouteFadeOutlet implements AfterViewInit {
  // เพิ่ม AfterViewInit
  containerClass = input('');
  duration = input('500ms');
  easing = input('ease-out');

  private cd = inject(ChangeDetectorRef); // inject CD เข้ามา

  ngAfterViewInit() {
    // บังคับให้ Angular ตรวจสอบการเปลี่ยนแปลงอีกรอบทันทีหลังจากที่ View เริ่มต้นเสร็จ
    // วิธีนี้จะล้าง Error NG0100 ที่เกิดจากการเปลี่ยนสถานะของ outlet ในรอบแรกได้ 100%
    this.cd.detectChanges();
  }
}
