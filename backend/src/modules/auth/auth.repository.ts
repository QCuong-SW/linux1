import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}
  async createSession(id: string, userId: string, expiresAt: Date) {
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } }),
      this.prisma.session.create({ data: { id, userId, expiresAt } }),
    ]);
  }
  findSession(id: string, userId: string) {
    return this.prisma.session.findFirst({
      where: { id, userId, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, email: true, createdAt: true } } },
    });
  }
  async revokeSession(id: string, userId: string) {
    await this.prisma.session.deleteMany({ where: { id, userId } });
  }
}
