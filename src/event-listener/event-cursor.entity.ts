import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('event_cursors')
export class EventCursor {
  @PrimaryColumn()
  contractId: string;

  @Column({ default: 'now' })
  cursor: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
