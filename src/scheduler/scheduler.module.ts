import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AgreementsModule } from '../agreements/agreements.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AgreementsModule, PaymentsModule, NotificationsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
