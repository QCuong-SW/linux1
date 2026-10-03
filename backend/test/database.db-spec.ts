import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma/prisma.service';
import type { Prisma } from '../src/database/prisma/generated/client';
import { HealthService } from '../src/modules/health/health.service';

config({ path: '.env.test', quiet: true });

describe('PostgreSQL schema and Prisma adapter', () => {
  let prisma: PrismaService;
  const rollback = new Error('rollback test fixture');

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !new URL(url).pathname.endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL must point to a dedicated database ending in _test');
    }
    prisma = new PrismaService(new ConfigService({ DATABASE_URL: url }));
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.onApplicationShutdown();
  });

  async function fixture(tx: Prisma.TransactionClient) {
    return tx.user.create({
      data: {
        email: `db-${randomUUID()}@example.test`,
        passwordHash: 'test-hash',
        projects: { create: { name: 'Database test', tasks: { create: { title: 'First task' } } } },
      },
      include: { projects: { include: { tasks: true } } },
    });
  }

  it('creates relations, defaults and timestamps, then updates task status', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const user = await fixture(tx);
        const project = user.projects[0];
        const task = project.tasks[0];
        expect(project.ownerId).toBe(user.id);
        expect(task.projectId).toBe(project.id);
        expect(task.status).toBe('TODO');
        expect(task.description).toBeNull();
        expect(task.createdAt).toBeInstanceOf(Date);
        const updated = await tx.task.update({ where: { id: task.id }, data: { status: 'DONE' } });
        expect(updated.status).toBe('DONE');
        expect(await tx.project.count({ where: { ownerId: randomUUID() } })).toBe(0);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it('rejects duplicate emails', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const user = await fixture(tx);
        await tx.user.create({ data: { email: user.email, passwordHash: 'another-hash' } });
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects projects without a valid owner', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.project.create({ data: { name: 'Orphan', ownerId: randomUUID() } });
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects tasks without a valid project', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.task.create({ data: { title: 'Orphan', projectId: randomUUID() } });
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('prevents accidental deletion of a project containing tasks', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const user = await fixture(tx);
        await tx.project.delete({ where: { id: user.projects[0].id } });
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('enforces the project name limit at the database layer', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const user = await fixture(tx);
        await tx.project.update({
          where: { id: user.projects[0].id },
          data: { name: 'x'.repeat(101) },
        });
      }),
    ).rejects.toMatchObject({ code: 'P2000' });
  });

  it('rejects sessions without a valid user', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.session.create({
          data: { userId: randomUUID(), expiresAt: new Date(Date.now() + 60000) },
        });
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('persists session expiry and cascades session deletion with its user', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const expiresAt = new Date(Date.now() + 60000);
        const user = await tx.user.create({
          data: {
            email: `session-${randomUUID()}@example.test`,
            passwordHash: 'test-hash',
            sessions: { create: { expiresAt } },
          },
          include: { sessions: true },
        });
        expect(user.sessions[0].expiresAt).toEqual(expiresAt);
        await tx.user.delete({ where: { id: user.id } });
        expect(await tx.session.count({ where: { userId: user.id } })).toBe(0);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it('reports readiness through the real shared Prisma service', async () => {
    await expect(new HealthService(prisma).check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });
});
