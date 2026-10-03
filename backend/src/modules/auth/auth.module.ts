import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
@Module({
  imports: [
    PrismaModule,
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256', issuer: 'miniflow', audience: 'miniflow-workspace' },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: 'miniflow',
          audience: 'miniflow-workspace',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AuthRepository],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
