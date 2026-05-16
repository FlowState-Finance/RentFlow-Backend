import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface NotificationPayload {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPaymentReminder(tenantEmail: string, dueDate: Date, amountXlm: string) {
    await this.send({
      to: tenantEmail,
      subject: '🏠 RentFlow — Rent Payment Reminder',
      html: `
        <h2>Rent Payment Due Soon</h2>
        <p>Your rent payment of <strong>${amountXlm} XLM</strong> is due on <strong>${dueDate.toDateString()}</strong>.</p>
        <p>Please ensure your wallet is funded and submit your payment via the RentFlow app.</p>
        <hr/>
        <small>RentFlow — Decentralized Rent Escrow</small>
      `,
    });
  }

  async sendOverdueAlert(tenantEmail: string, landlordEmail: string, amountXlm: string) {
    const subject = '⚠️ RentFlow — Overdue Rent Payment';
    const html = (recipient: string) => `
      <h2>Overdue Payment Alert</h2>
      <p>A rent payment of <strong>${amountXlm} XLM</strong> is now overdue.</p>
      <p>This notice has been sent to both the tenant and landlord.</p>
      <hr/>
      <small>RentFlow — Decentralized Rent Escrow</small>
    `;

    await Promise.all([
      this.send({ to: tenantEmail, subject, html: html('tenant') }),
      this.send({ to: landlordEmail, subject, html: html('landlord') }),
    ]);
  }

  async sendAgreementActivated(tenantEmail: string, landlordEmail: string, agreementId: string) {
    const subject = '✅ RentFlow — Agreement Activated';
    const html = `
      <h2>Your Rent Agreement is Now Active</h2>
      <p>Agreement ID: <code>${agreementId}</code></p>
      <p>The deposit has been received and the agreement is now active on the Stellar blockchain.</p>
      <hr/>
      <small>RentFlow — Decentralized Rent Escrow</small>
    `;
    await Promise.all([
      this.send({ to: tenantEmail, subject, html }),
      this.send({ to: landlordEmail, subject, html }),
    ]);
  }

  private async send(payload: NotificationPayload): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'RentFlow <noreply@rentflow.io>'),
        ...payload,
      });
      this.logger.log(`Email sent to ${payload.to}: ${payload.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${payload.to}`, err.message);
    }
  }
}
