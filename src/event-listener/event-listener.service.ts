import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StellarService } from '../stellar/stellar.service';
import { AgreementsService } from '../agreements/agreements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AgreementStatus } from '../agreements/agreement.entity';
import { EventCursor } from './event-cursor.entity';

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private stopStream: (() => void) | null = null;

  constructor(
    private readonly stellarService: StellarService,
    private readonly agreementsService: AgreementsService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
    @InjectRepository(EventCursor)
    private readonly cursorRepo: Repository<EventCursor>,
  ) {}

  async onModuleInit() {
    const contractId = this.config.get<string>('SOROBAN_CONTRACT_ID');
    if (!contractId) {
      this.logger.warn('SOROBAN_CONTRACT_ID not set — event listener disabled');
      return;
    }
    await this.startListening(contractId);
  }

  onModuleDestroy() {
    this.stopStream?.();
  }

  private async startListening(contractId: string) {
    const cursor = await this.getOrCreateCursor(contractId);
    this.logger.log(`Starting event stream for contract ${contractId} from cursor ${cursor}`);

    this.stopStream = await this.stellarService.streamContractEvents(
      contractId,
      cursor,
      (event) => this.handleEvent(event, contractId),
    );
  }

  private async handleEvent(event: any, contractId: string) {
    try {
      const txHash = event?.id ?? event?.hash;
      const memo: string = event?.memo_value ?? '';

      this.logger.debug(`Contract event received: ${txHash}`);

      // Parse memo to extract agreement ID (format: "rentflow:<agreementId>")
      if (memo.startsWith('rentflow:')) {
        const agreementId = memo.replace('rentflow:', '').trim();
        await this.syncAgreementFromEvent(agreementId, event);
      }

      // Persist cursor so we resume from here on restart
      await this.saveCursor(contractId, txHash);
    } catch (err) {
      this.logger.error('Error handling contract event', err.message);
    }
  }

  private async syncAgreementFromEvent(agreementId: string, event: any) {
    try {
      const agreement = await this.agreementsService.findById(agreementId);

      // If agreement is pending and we see a deposit tx, activate it
      if (agreement.status === AgreementStatus.PENDING) {
        await this.agreementsService.updateStatus(agreementId, AgreementStatus.ACTIVE);
        await this.notificationsService.sendAgreementActivated(
          agreement.tenant.email,
          agreement.landlord.email,
          agreementId,
        );
        this.logger.log(`Agreement ${agreementId} activated via on-chain event`);
      }
    } catch {
      // Agreement not found — event may be for a different purpose
    }
  }

  private async getOrCreateCursor(contractId: string): Promise<string> {
    let record = await this.cursorRepo.findOne({ where: { contractId } });
    if (!record) {
      record = this.cursorRepo.create({ contractId, cursor: 'now' });
      await this.cursorRepo.save(record);
    }
    return record.cursor;
  }

  private async saveCursor(contractId: string, cursor: string): Promise<void> {
    await this.cursorRepo.update({ contractId }, { cursor });
  }
}
