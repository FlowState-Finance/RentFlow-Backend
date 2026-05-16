import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import { Payment, PaymentStatus, PaymentType } from './payment.entity';
import { AgreementsService } from '../agreements/agreements.service';
import { StellarService } from '../stellar/stellar.service';
import { PayRentDto } from './dto/pay-rent.dto';
import { AgreementStatus } from '../agreements/agreement.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
    private readonly agreementsService: AgreementsService,
    private readonly stellarService: StellarService,
  ) {}

  async payRent(payerId: string, dto: PayRentDto): Promise<Payment> {
    const agreement = await this.agreementsService.findById(dto.agreementId);

    if (agreement.status !== AgreementStatus.ACTIVE) {
      throw new BadRequestException('Agreement is not active');
    }

    if (parseFloat(dto.amountXlm) < parseFloat(agreement.monthlyRentXlm)) {
      throw new BadRequestException(
        `Minimum payment is ${agreement.monthlyRentXlm} XLM`,
      );
    }

    const dueDate = this.getCurrentDueDate(agreement);
    const windowOpen = this.isWithinPaymentWindow(dueDate);
    if (!windowOpen) {
      throw new BadRequestException('Outside of payment window (±3 days from due date)');
    }

    // Submit to Stellar
    const txResult = await this.stellarService.submitRentPayment({
      fromSecret: dto.signerSecret,
      toPublicKey: agreement.landlord.stellarPublicKey,
      amountXlm: dto.amountXlm,
      agreementId: agreement.id,
    });

    const payment = this.repo.create({
      agreement,
      payer: { id: payerId } as any,
      amountXlm: dto.amountXlm,
      type: dto.type ?? PaymentType.RENT,
      status: PaymentStatus.CONFIRMED,
      txHash: txResult.hash,
      ledger: txResult.ledger,
      dueDate,
      paidAt: new Date(),
    });

    return this.repo.save(payment);
  }

  async findByAgreement(agreementId: string): Promise<Payment[]> {
    return this.repo.find({
      where: { agreement: { id: agreementId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOverdue(): Promise<Payment[]> {
    return this.repo.find({
      where: { status: PaymentStatus.OVERDUE },
      relations: ['agreement', 'agreement.tenant', 'agreement.landlord'],
    });
  }

  async markOverdue(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repo
      .createQueryBuilder()
      .update(Payment)
      .set({ status: PaymentStatus.OVERDUE })
      .whereInIds(ids)
      .execute();
  }

  async findUpcoming(withinDays = 3): Promise<Payment[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + withinDays);
    return this.repo.find({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: Between(now, future) as any,
      },
      relations: ['agreement', 'agreement.tenant'],
    });
  }

  async createScheduledPayments(agreements: any[]): Promise<void> {
    const now = new Date();
    for (const agreement of agreements) {
      const dueDate = this.getCurrentDueDate(agreement);
      const exists = await this.repo.findOne({
        where: {
          agreement: { id: agreement.id },
          dueDate,
          status: PaymentStatus.PENDING,
        },
      });
      if (!exists) {
        await this.repo.save(
          this.repo.create({
            agreement,
            payer: agreement.tenant,
            amountXlm: agreement.monthlyRentXlm,
            type: PaymentType.RENT,
            status: PaymentStatus.PENDING,
            dueDate,
          }),
        );
      }
    }
  }

  private getCurrentDueDate(agreement: any): Date {
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), agreement.paymentDayOfMonth);
    return due;
  }

  private isWithinPaymentWindow(dueDate: Date, windowDays = 3): boolean {
    const now = new Date();
    const diff = Math.abs(now.getTime() - dueDate.getTime());
    return diff <= windowDays * 24 * 60 * 60 * 1000;
  }
}
