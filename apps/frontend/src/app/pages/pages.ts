import { Component, computed, inject, OnInit, signal } from '@angular/core';

import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterModule,
} from '@angular/router';
// import { Spinner } from '../shared/components/spinner/spinner';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-pages',
  imports: [RouterModule],
  templateUrl: './pages.html',
})
export class Pages implements OnInit {
  private readonly router = inject(Router);

  // 💡 1. ตัวแปรเก็บสถานะ "รีเฟรชหน้า/เข้าหน้าครั้งแรก"
  // เริ่มต้นเป็น true เสมอเพื่อดักจับจังหวะเปิดหน้าเว็บหรือกด F5
  private isInitialPageLoad = signal<boolean>(true);

  // 💡 2. ดักจับทราฟฟิกสถานะการเปลี่ยน Route ของผู้ใช้
  private isNavigating$ = this.router.events.pipe(
    filter(
      (event) =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError,
    ),
    map((event) => event instanceof NavigationStart),
  );

  private isNavigating = toSignal(this.isNavigating$, { initialValue: false });

  ngOnInit() {
    // 💡 3. เมื่อ Component โหลดโครงสร้างและการดึงข้อมูลเริ่มต้นผ่านไปแล้ว
    // ให้สั่งปิดโหมดรีเฟรชหน้าจอ (เปิดโอกาสให้หน้าเว็บแสดงผลปกติแบบไม่วูบวาบอีกเวลาดึง API)
    setTimeout(() => {
      this.isInitialPageLoad.set(false);
    }, 400); // 400ms ครอบคลุมจังหวะที่หน้าจอกำลังเฟดเข้าพอดี
  }

  /**
   * 💡 4. รวมร่างเงื่อนไขสำหรับการเปิดตัว Spinner และซ่อนหน้าเว็บ
   * คืนค่า true เฉพาะตอน:
   * - ยูสเซอร์กดเปลี่ยนลิงก์ย้ายหน้า (isNavigating เป็น true)
   * - ยูสเซอร์เพิ่งกด Refresh หน้าเว็บ (isInitialPageLoad เป็น true)
   */
  public isLoadingSpinner = computed(() => {
    return this.isNavigating() || this.isInitialPageLoad();
  });
}
