import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventListenerService } from './event-listener.service';
import { EventCursor } from './event-cursor.entity';
import { StellarModule } from '../stellar/stellar.module';
import { AgreementsModule } from '../agreements/agreements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventCursor]),
    StellarModule,
    AgreementsModule,
    NotificationsModule,
  ],
  providers: [EventListenerService],
})
export class EventListenerModule {}
