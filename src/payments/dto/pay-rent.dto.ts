import { IsUUID, IsString, IsEnum, IsOptional } from 'class-validator';
import { PaymentType } from '../payment.entity';

export class PayRentDto {
  @IsUUID()
  agreementId: string;

  @IsString()
  amountXlm: string;

  @IsEnum(PaymentType)
  @IsOptional()
  type?: PaymentType;

  @IsString()
  @IsOptional()
  signerSecret?: string;
}
