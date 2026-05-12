import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-delete-dialog.component.html',
  styleUrls: ['./confirm-delete-dialog.component.css'],
})
export class ConfirmDeleteDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Delete item';
  @Input() message = 'Are you sure you want to delete this item?';
  @Input() confirmText = 'Delete';
  @Input() cancelText = 'Cancel';
  @Input() isProcessing = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isOpen && !this.isProcessing) {
      this.cancel.emit();
    }
  }

  onOverlayClick(): void {
    if (!this.isProcessing) {
      this.cancel.emit();
    }
  }

  onCancel(): void {
    if (!this.isProcessing) {
      this.cancel.emit();
    }
  }

  onConfirm(): void {
    if (!this.isProcessing) {
      this.confirm.emit();
    }
  }
}
