import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stellar')
@UseGuards(JwtAuthGuard)
export class StellarController {
  constructor(private readonly stellarService: StellarService) {}

  @Get('balance/:publicKey')
  getBalance(@Param('publicKey') publicKey: string) {
    return this.stellarService.getAccountBalance(publicKey).then((balance) => ({
      publicKey,
      balanceXlm: balance,
    }));
  }

  @Get('tx/:hash')
  getTransaction(@Param('hash') hash: string) {
    return this.stellarService.getTransaction(hash);
  }
}
