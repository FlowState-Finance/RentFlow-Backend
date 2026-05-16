import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum AgreementStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  DISPUTED = 'disputed',
}

@Entity('agreements')
export class Agreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'landlord_id' })
  landlord: User;

  @Column('decimal', { precision: 18, scale: 7 })
  monthlyRentXlm: string;

  @Column('decimal', { precision: 18, scale: 7 })
  depositXlm: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: 1 })
  paymentDayOfMonth: number;

  @Column({ type: 'enum', enum: AgreementStatus, default: AgreementStatus.PENDING })
  status: AgreementStatus;

  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  propertyAddress: string;

  @Column({ nullable: true })
  depositTxHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
