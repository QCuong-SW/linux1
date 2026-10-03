import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
import type { AuthRequest } from '../decorators/current-user.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const session = await this.auth.authenticate(cookies?.miniflow_session);
    request.user = session.user;
    request.sessionId = session.id;
    return true;
  }
}
