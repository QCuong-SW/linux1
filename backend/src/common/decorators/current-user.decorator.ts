import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type SessionUser = { id: string; email: string; createdAt: Date };
export type AuthRequest = Request & { user: SessionUser; sessionId: string };
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);
