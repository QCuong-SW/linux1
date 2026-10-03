import { APP_GUARD } from '@nestjs/core';
import { OriginGuard } from './common/guards/origin.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    HealthModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: OriginGuard }],
})
export class AppModule {}
