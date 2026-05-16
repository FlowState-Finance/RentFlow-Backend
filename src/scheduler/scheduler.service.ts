import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgreementsService } from '../agreements/agreements.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus } from '../payments/payment.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly agreementsService: AgreementsService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Every day at 8 AM — create pending payment records for active agreements
   * and send reminders for payments due within 3 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduleUpcomingPayments() {
    this.logger.log('Running: scheduleUpcomingPayments');
    try {
      const activeAgreements = await this.agreementsService.findActive();
      await this.paymentsService.createScheduledPayments(activeAgreements);

      const upcoming = await this.paymentsService.findUpcoming(3);
      for (const payment of upcoming) {
        const tenant = payment.agreement.tenant;
        await this.notificationsService.sendPaymentReminder(
          tenant.email,
          payment.dueDate,
          payment.amountXlm,
        );
      }
      this.logger.log(`Reminders sent for ${upcoming.length} upcoming payments`);
    } catch (err) {
      this.logger.error('scheduleUpcomingPayments failed', err.message);
    }
  }

  /**
   * Every day at midnight — flag overdue payments and alert both parties.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async flagOverduePayments() {
    this.logger.log('Running: flagOverduePayments');
    try {
      const upcoming = await this.paymentsService.findUpcoming(0);
      const now = new Date();

      const overdueIds = upcoming
        .filter((p) => new Date(p.dueDate) < now && p.status === PaymentStatus.PENDING)
        .map((p) => p.id);

      if (overdueIds.length > 0) {
        await this.paymentsService.markOverdue(overdueIds);
        this.logger.log(`Marked ${overdueIds.length} payments as overdue`);
      }

      const overdue = await this.paymentsService.findOverdue();
      for (const payment of overdue) {
        const { tenant, landlord } = payment.agreement;
        await this.notificationsService.sendOverdueAlert(
          tenant.email,
          landlord.email,
          payment.amountXlm,
        );
      }
    } catch (err) {
      this.logger.error('flagOverduePayments failed', err.message);
    }
  }
}
