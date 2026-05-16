import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgreementsService } from './agreements.service';
import { Agreement } from './agreement.entity';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '@nestjs/common';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
  update: jest.fn(),
};

const mockUsersService = {
  findById: jest.fn(),
};

describe('AgreementsService', () => {
  let service: AgreementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        { provide: getRepositoryToken(Agreement), useValue: mockRepo },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AgreementsService>(AgreementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException when startDate >= endDate', async () => {
    mockUsersService.findById.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.create({
        tenantId: 'tenant-id',
        landlordId: 'landlord-id',
        monthlyRentXlm: '100',
        depositXlm: '200',
        startDate: '2025-01-01',
        endDate: '2024-01-01',
        paymentDayOfMonth: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
