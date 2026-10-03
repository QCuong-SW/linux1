import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import type { CookieOptions } from 'express';
import { randomUUID } from 'node:crypto';
import { AuthRepository } from './auth.repository';
import { Prisma } from '../../database/prisma/generated/client';
import type { SessionUser } from '../../common/decorators/current-user.decorator';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  readonly cookieName = 'miniflow_session';
  private readonly dummyHash = hash(randomUUID(), 12);
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  get cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/',
    };
  }
  private get ttlSeconds() {
    const duration = this.config.getOrThrow<string>('JWT_EXPIRES_IN');
    const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Number(duration.slice(0, -1)) * units[duration.slice(-1)];
  }
  private checkPassword(password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72)
      throw new BadRequestException('Password must not exceed 72 UTF-8 bytes');
  }
  private publicUser(user: SessionUser): SessionUser {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
  async register(dto: LoginDto) {
    this.checkPassword(dto.password);
    const passwordHash = await hash(dto.password, 12);
    const id = randomUUID();
    const session = await this.issueSession(id);
    let user;
    try {
      user = await this.users.create(dto.email, passwordHash, id, {
        id: session.id,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Email is already registered');
      throw error;
    }
    return { user: this.publicUser(user), token: session.token, expiresAt: session.expiresAt };
  }
  async login(dto: LoginDto) {
    this.checkPassword(dto.password);
    const user = await this.users.findByEmail(dto.email);
    const valid = await compare(dto.password, user?.passwordHash ?? (await this.dummyHash));
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');
    const session = await this.issueSession(user.id);
    await this.sessions.createSession(session.id, user.id, session.expiresAt);
    return { user: this.publicUser(user), token: session.token, expiresAt: session.expiresAt };
  }
  private async issueSession(userId: string) {
    const ttl = this.ttlSeconds;
    const expiresAt = new Date((Math.floor(Date.now() / 1000) + ttl) * 1000);
    const id = randomUUID();
    const token = await this.jwt.signAsync({ sub: userId, sid: id }, { expiresIn: ttl });
    return { id, token, expiresAt };
  }
  async authenticate(token: unknown) {
    if (typeof token !== 'string') throw new UnauthorizedException('Authentication required');
    let payload: { sub: string; sid: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; sid: string }>(token);
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(payload.sid) ||
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(payload.sub)
      )
        throw new Error('Invalid payload');
    } catch {
      throw new UnauthorizedException('Session is invalid or expired');
    }
    const session = await this.sessions.findSession(payload.sid, payload.sub);
    if (!session) throw new UnauthorizedException('Session is invalid or expired');
    return session;
  }
  async logout(token: unknown) {
    // Logout remains idempotent for an expired or absent cookie.
    try {
      const session = await this.authenticate(token);
      await this.sessions.revokeSession(session.id, session.userId);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
    }
  }
}
