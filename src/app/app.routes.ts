import { Routes } from '@angular/router';
import { DashboardPageComponent } from './dashboard/dashboard-page.component';
import { CashboxPageComponent } from './dashboard/pages/cashbox-page.component';
import { DoctorAvailabilityPageComponent } from './dashboard/pages/doctor-availability-page.component';
import { PatientsPageComponent } from './dashboard/pages/patients-page.component';
import { ChronicDiseasesPageComponent } from './dashboard/pages/chronic-diseases-page.component';
import { ProfilePageComponent } from './dashboard/pages/profile-page.component';
import { ReservationsPageComponent } from './dashboard/pages/reservations-page.component';
import { UsersPageComponent } from './dashboard/pages/users-page.component';
import { WhatsappNotificationsPageComponent } from './dashboard/pages/whatsapp-notifications-page.component';
import { LoginPageComponent } from './auth/login-page.component';
import { RegisterPageComponent } from './auth/register-page.component';
import { authChildGuard, authGuard, guestGuard, superAdminGuard } from './auth/auth.guards';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login',
	},
	{
		path: 'login',
		component: LoginPageComponent,
		canActivate: [guestGuard],
	},
	{
		path: 'register',
		component: RegisterPageComponent,
		canActivate: [guestGuard],
	},
	{
		path: 'dashboard',
		component: DashboardPageComponent,
		canActivate: [authGuard],
		canActivateChild: [authChildGuard],
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'patients',
			},
			{
				path: 'patients',
				component: PatientsPageComponent,
			},
			{
				path: 'chronic-diseases',
				component: ChronicDiseasesPageComponent,
			},
			{
				path: 'reservations',
				component: ReservationsPageComponent,
			},
			{
				path: 'doctor-availability',
				component: DoctorAvailabilityPageComponent,
			},
			{
				path: 'users',
				component: UsersPageComponent,
				canActivate: [superAdminGuard],
			},
			{
				path: 'cashbox',
				component: CashboxPageComponent,
				canActivate: [superAdminGuard],
			},
			{
				path: 'whatsapp-notifications',
				component: WhatsappNotificationsPageComponent,
			},
			{
				path: 'profile',
				component: ProfilePageComponent,
			},
		],
	},
	{
		path: '**',
		redirectTo: 'login',
	},
];
