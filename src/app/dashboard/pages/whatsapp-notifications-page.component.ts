import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface WhatsappMessageRecord {
  receiverMobile: string;
  messageBody: string;
  sentDate: string;
}

interface NewWhatsappMessageForm {
  receiverMobile: string;
  messageBody: string;
}

@Component({
  selector: 'app-whatsapp-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-notifications-page.component.html',
  styleUrl: './whatsapp-notifications-page.component.css',
})
export class WhatsappNotificationsPageComponent {
  isCreateDialogOpen = false;

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isCreateDialogOpen) {
      this.closeCreateDialog();
    }
  }

  readonly messages: WhatsappMessageRecord[] = [
    {
      receiverMobile: '+201002221111',
      messageBody: 'Reminder: your reservation is tomorrow at 10:00 AM.',
      sentDate: '2026-05-11T14:15:00Z',
    },
    {
      receiverMobile: '+201003332222',
      messageBody: 'Your lab result is ready. Please visit the clinic reception.',
      sentDate: '2026-05-10T09:42:00Z',
    },
    {
      receiverMobile: '+201004443333',
      messageBody: 'Your appointment has been confirmed for Friday 5:30 PM.',
      sentDate: '2026-05-09T16:05:00Z',
    },
  ];

  readonly newMessageForm: NewWhatsappMessageForm = {
    receiverMobile: '',
    messageBody: '',
  };

  openCreateDialog(): void {
    this.isCreateDialogOpen = true;
  }

  closeCreateDialog(): void {
    this.isCreateDialogOpen = false;
  }

  exportLogsToExcel(): void {
    if (this.messages.length === 0 || typeof document === 'undefined') {
      return;
    }

    const headerRow = ['Receiver Mobile Number', 'Message Description', 'Sent Date'];
    const dataRows = this.messages.map((message) => [
      message.receiverMobile,
      message.messageBody,
      new Date(message.sentDate).toLocaleString(),
    ]);

    const worksheetRows = [headerRow, ...dataRows]
      .map(
        (row) =>
          `<Row>${row
            .map((cell) => `<Cell><Data ss:Type="String">${this.escapeXml(cell)}</Data></Cell>`)
            .join('')}</Row>`
      )
      .join('');

    const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="WhatsApp Logs">
  <Table>${worksheetRows}</Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([workbook], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `whatsapp-message-delivery-log-${dateStamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  createMessage(): void {
    const receiverMobile = this.newMessageForm.receiverMobile.trim();
    const messageBody = this.newMessageForm.messageBody.trim();

    if (!receiverMobile || !messageBody) {
      return;
    }

    this.messages.unshift({
      receiverMobile,
      messageBody,
      sentDate: new Date().toISOString(),
    });

    this.newMessageForm.receiverMobile = '';
    this.newMessageForm.messageBody = '';
    this.closeCreateDialog();
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
