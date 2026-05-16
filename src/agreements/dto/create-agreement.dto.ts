import {
  IsUUID,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateAgreementDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  landlordId: string;

  @IsString()
  monthlyRentXlm: string;

  @IsString()
  depositXlm: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(1)
  @Max(28)
  paymentDayOfMonth: number;

  @IsOptional()
  @IsString()
  propertyAddress?: string;

  @IsOptional()
  @IsString()
  contractId?: string;
}
