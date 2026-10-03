import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { SessionUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get()
  summary(@CurrentUser() user: SessionUser) {
    return this.dashboard.summary(user.id);
  }
}
