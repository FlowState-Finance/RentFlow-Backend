import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agreement, AgreementStatus } from './agreement.entity';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(Agreement)
    private readonly repo: Repository<Agreement>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateAgreementDto): Promise<Agreement> {
    const tenant = await this.usersService.findById(dto.tenantId);
    const landlord = await this.usersService.findById(dto.landlordId);

    if (!tenant || !landlord) throw new NotFoundException('User not found');
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const agreement = this.repo.create({
      tenant,
      landlord,
      monthlyRentXlm: dto.monthlyRentXlm,
      depositXlm: dto.depositXlm,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      paymentDayOfMonth: dto.paymentDayOfMonth,
      propertyAddress: dto.propertyAddress,
      contractId: dto.contractId,
    });

    return this.repo.save(agreement);
  }

  async findById(id: string): Promise<Agreement> {
    const agreement = await this.repo.findOne({ where: { id } });
    if (!agreement) throw new NotFoundException(`Agreement ${id} not found`);
    return agreement;
  }

  async findByUser(userId: string): Promise<Agreement[]> {
    return this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.tenant', 'tenant')
      .leftJoinAndSelect('a.landlord', 'landlord')
      .where('tenant.id = :userId OR landlord.id = :userId', { userId })
      .orderBy('a.createdAt', 'DESC')
      .getMany();
  }

  async updateStatus(id: string, status: AgreementStatus): Promise<Agreement> {
    const agreement = await this.findById(id);
    agreement.status = status;
    return this.repo.save(agreement);
  }

  async findActive(): Promise<Agreement[]> {
    return this.repo.find({ where: { status: AgreementStatus.ACTIVE } });
  }

  async setContractId(id: string, contractId: string): Promise<void> {
    await this.repo.update(id, { contractId });
  }
}
