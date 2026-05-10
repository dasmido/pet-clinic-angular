import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reservations-page.component.html',
  styleUrl: './dashboard-feature-page.css',
})
export class ReservationsPageComponent {
  readonly metrics = [
    { label: 'Confirmed', value: '42', delta: '+8' },
    { label: 'Walk-ins', value: '11', delta: '+2' },
    { label: 'Canceled', value: '4', delta: '-1' },
  ];

  readonly records = [
    { heading: '08:40', subheading: 'Dental review · Dr. Green', status: 'Booked' },
    { heading: '10:15', subheading: 'Puppy vaccines · Desk A', status: 'Confirmed' },
    { heading: '13:00', subheading: 'Ultrasound · Dr. Patel', status: 'Priority' },
  ];
}
