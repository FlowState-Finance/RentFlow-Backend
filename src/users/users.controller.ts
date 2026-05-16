import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgreementsService } from '../agreements/agreements.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get('agreements')
  getMyAgreements(@Request() req) {
    return this.agreementsService.findByUser(req.user.id);
  }

  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
