import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-doctor-availability-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-availability-page.component.html',
  styleUrl: './dashboard-feature-page.css',
})
export class DoctorAvailabilityPageComponent {
  readonly metrics = [
    { label: 'On duty', value: '8', delta: '+1' },
    { label: 'Busy slots', value: '5', delta: '+2' },
    { label: 'Open hours', value: '12', delta: 'stable' },
  ];

  readonly records = [
    { heading: 'Dr. Brown', subheading: '08:00 - 15:00', status: 'Available' },
    { heading: 'Dr. Patel', subheading: '09:30 - 17:00', status: 'In surgery' },
    { heading: 'Dr. Green', subheading: '12:00 - 20:00', status: 'On call' },
  ];
}
