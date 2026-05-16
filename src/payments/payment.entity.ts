import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agreement } from '../agreements/agreement.entity';
import { User } from '../users/user.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  OVERDUE = 'overdue',
}

export enum PaymentType {
  RENT = 'rent',
  DEPOSIT = 'deposit',
  DEPOSIT_REFUND = 'deposit_refund',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agreement, { eager: true })
  @JoinColumn({ name: 'agreement_id' })
  agreement: Agreement;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'payer_id' })
  payer: User;

  @Column('decimal', { precision: 18, scale: 7 })
  amountXlm: string;

  @Column({ type: 'enum', enum: PaymentType, default: PaymentType.RENT })
  type: PaymentType;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true })
  txHash: string;

  @Column({ nullable: true })
  ledger: number;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ nullable: true, type: 'timestamp' })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
