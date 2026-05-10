import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-page.component.html',
  styleUrl: './dashboard-feature-page.css',
})
export class UsersPageComponent {
  readonly metrics = [
    { label: 'Active staff', value: '24', delta: '+3' },
    { label: 'Pending invites', value: '6', delta: '+1' },
    { label: 'Superadmins', value: '2', delta: 'locked' },
  ];

  readonly records = [
    { heading: 'Sara', subheading: 'Reception', status: 'Active' },
    { heading: 'Noah', subheading: 'Nurse', status: 'Active' },
    { heading: 'Amira', subheading: 'Admin', status: 'Pending' },
  ];
}
