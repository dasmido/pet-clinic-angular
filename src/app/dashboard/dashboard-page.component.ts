import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStateService } from '../auth/auth-state.service';
import { NG_ICON_DIRECTIVES, provideIcons } from '@ng-icons/core';
import {
  matGroupsOutline as matGroups,
  matMedicationOutline as matMedication,
  matEventAvailableOutline as matEventAvailable,
  matCalendarMonthOutline as matCalendarMonth,
  matManageAccountsOutline as matManageAccounts,
  matPointOfSaleOutline as matPointOfSale,
  matAccountCircleOutline as matAccountCircle,
  matCakeOutline as matCoffeeMaker

} from '@ng-icons/material-icons/outline';
interface SidebarNavItem {
  icon: string;
  label: string;
  path: string;
  hint: string;
  requiresSuperAdmin?: boolean;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ...NG_ICON_DIRECTIVES],
  viewProviders: [
    provideIcons({
      groups: matGroups,
      medication: matMedication,
      event_available: matEventAvailable,
      manage_accounts: matManageAccounts,
      point_of_sale: matPointOfSale,
      account_circle: matAccountCircle,
      coffee_maker: matCoffeeMaker,
    }),
  ],
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
    { icon: 'groups', label: 'Patients', path: 'patients', hint: 'Queue and records' },
    // { icon: 'medication', label: 'Chronic Diseases', path: 'chronic-diseases', hint: 'Disease management' },
    { icon: 'event_available', label: 'Reservations', path: 'reservations', hint: 'Appointments' },
    { icon: 'coffee_maker', label: 'Doctor Availability', path: 'doctor-availability', hint: 'Availability' },
    { icon: 'manage_accounts', label: 'Users', path: 'users', hint: 'Staff access', requiresSuperAdmin: true },
    { icon: 'point_of_sale', label: 'Cashbox', path: 'cashbox', hint: 'Payments', requiresSuperAdmin: true },
    { icon: 'medication', label: 'Whatsapp Notifications', path: 'whatsapp-notifications', hint: 'Message templates' },
    { icon: 'account_circle', label: 'Profile', path: 'profile', hint: 'Admin account' },
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
