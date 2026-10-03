import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnApplicationShutdown {
  constructor(config: ConfigService) {
    const url = new URL(config.getOrThrow<string>('DATABASE_URL'));
    const adapter = new PrismaPg(
      {
        connectionString: url.toString(),
        max: 10,
        connectionTimeoutMillis: 2000,
        statement_timeout: 5000,
        idleTimeoutMillis: 10000,
      },
      {
        schema: url.searchParams.get('schema') ?? 'public',
        onPoolError: () => {
          // Readiness reports DB availability without logging credentials.
        },
      },
    );
    super({ adapter });
    // Connect lazily so health can report 503 and recover when PostgreSQL returns.
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
