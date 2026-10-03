import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  create(
    email: string,
    passwordHash: string,
    id: string,
    session: { id: string; expiresAt: Date },
  ) {
    return this.prisma.user.create({
      data: { id, email, passwordHash, sessions: { create: session } },
    });
  }
}
