import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faCashRegister,
  faCalendarCheck,
  faCalendarDays,
  faCircleUser,
  faUserGear,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { AuthStateService } from '../auth/auth-state.service';
interface SidebarNavItem {
  icon: IconDefinition;
  label: string;
  path: string;
  hint: string;
  requiresSuperAdmin?: boolean;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, FontAwesomeModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  isSidebarOpen = false;

  get currentRole(): string {
    return this.authState.getRole() ?? 'UNKNOWN';
  }



  readonly navItems: SidebarNavItem[] = [
    { icon: faUsers, label: 'Patients', path: 'patients', hint: 'Queue and records' },
    { icon: faCalendarCheck, label: 'Reservations', path: 'reservations', hint: 'Appointments' },
    { icon: faCalendarDays, label: 'Doctor Availability', path: 'doctor-availability', hint: 'Availability' },
    { icon: faUserGear, label: 'Users', path: 'users', hint: 'Staff access', requiresSuperAdmin: true },
    { icon: faCashRegister, label: 'Cashbox', path: 'cashbox', hint: 'Payments', requiresSuperAdmin: true },
    { icon: faBell, label: 'Whatsapp Notifications', path: 'whatsapp-notifications', hint: 'Message templates' },
    { icon: faCircleUser, label: 'Profile', path: 'profile', hint: 'Admin account' },
  ];

  get visibleNavItems(): SidebarNavItem[] {
    const isSuperAdmin = this.authState.getRole() === 'SUPERADMIN';

    return this.navItems.filter((item) => !item.requiresSuperAdmin || isSuperAdmin);
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    if (window.innerWidth > 920 && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth <= 920) {
      this.isSidebarOpen = false;
    }
  }

  logout(): void {
    this.closeSidebar();
    this.authState.clearSession();
    void this.router.navigate(['/login']);
  }
}
