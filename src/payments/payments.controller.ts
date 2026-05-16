import { Controller, Post, Get, Param, Body, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PayRentDto } from './dto/pay-rent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('rent')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('pay')
  pay(@Request() req, @Body() dto: PayRentDto) {
    return this.service.payRent(req.user.id, dto);
  }

  @Get('history/:agreementId')
  history(@Param('agreementId', ParseUUIDPipe) agreementId: string) {
    return this.service.findByAgreement(agreementId);
  }

  @Get('overdue')
  overdue() {
    return this.service.findOverdue();
  }
}
