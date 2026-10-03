import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
@Injectable()
export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}
  summary(ownerId: string) {
    return this.dashboard.summary(ownerId);
  }
}
