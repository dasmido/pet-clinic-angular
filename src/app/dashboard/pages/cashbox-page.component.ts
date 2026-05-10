import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-cashbox-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cashbox-page.component.html',
  styleUrl: './dashboard-feature-page.css',
})
export class CashboxPageComponent {
  readonly metrics = [
    { label: 'Collected', value: '$3,240', delta: '+8.1%' },
    { label: 'Open invoices', value: '18', delta: '-2' },
    { label: 'Refunds', value: '2', delta: 'stable' },
  ];

  readonly records = [
    { heading: 'Consultation fees', subheading: '12 paid today', status: '$1,240' },
    { heading: 'Medication sales', subheading: '8 invoices open', status: '$860' },
    { heading: 'Refund queue', subheading: '2 pending reviews', status: '$140' },
  ];
}
