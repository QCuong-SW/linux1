import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { SessionUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.register(dto);
    response.cookie(this.auth.cookieName, session.token, {
      ...this.auth.cookieOptions,
      expires: session.expiresAt,
    });
    return session.user;
  }
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(dto);
    response.cookie(this.auth.cookieName, session.token, {
      ...this.auth.cookieOptions,
      expires: session.expiresAt,
    });
    return session.user;
  }
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    await this.auth.logout(cookies?.[this.auth.cookieName]);
    response.clearCookie(this.auth.cookieName, this.auth.cookieOptions);
  }
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: SessionUser) {
    return user;
  }
}
