import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { HealthService } from './health.service';

describe('database readiness', () => {
  const query = jest.fn();
  let service: HealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HealthService({ $queryRaw: query } as unknown as PrismaService);
  });

  it('reports readiness only after a successful DB query', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(service.check()).resolves.toEqual({ status: 'ok', database: 'up' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns 503 without leaking connection errors', async () => {
    query.mockRejectedValueOnce(new Error('connection failed: secret-password'));
    try {
      await service.check();
      throw new Error('Expected readiness failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const exception = error as ServiceUnavailableException;
      expect(exception.getStatus()).toBe(503);
      expect(exception.getResponse()).toEqual({ status: 'error', database: 'down' });
    }
  });
});
