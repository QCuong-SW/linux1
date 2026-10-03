import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { compare } from 'bcryptjs';
import { config } from 'dotenv';
import request from 'supertest';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';

config({ path: '.env.test', quiet: true });
const origin = 'http://localhost:3000';
const password = 'Strong-password-123';

describe('Backend journey with real PostgreSQL', () => {
  let app: INestApplication;
  let appModule: typeof import('../src/app.module').AppModule;
  let server: Server;
  let prisma: PrismaService;
  let cookieA: string;
  let cookieB: string;
  let userA: string;
  let userB: string;
  let projectId: string;
  let taskId: string;
  const suffix = randomUUID();
  const emailA = `a-${suffix}@example.test`;
  const emailB = `b-${suffix}@example.test`;
  const raceEmail = `race-${suffix}@example.test`;

  function post(path: string, cookie?: string) {
    const req = request(server).post(path).set('Origin', origin);
    return cookie ? req.set('Cookie', cookie) : req;
  }
  function get(path: string, cookie = cookieA) {
    return request(server).get(path).set('Cookie', cookie);
  }
  function patch(path: string, cookie = cookieA) {
    return request(server).patch(path).set('Origin', origin).set('Cookie', cookie);
  }
  function cookieFrom(response: request.Response) {
    const cookies = response.headers['set-cookie'] as unknown as string[];
    return cookies[0].split(';')[0];
  }
  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error('Dedicated TEST_DATABASE_URL ending in _test is required');
    process.env.DATABASE_URL = url;
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_ORIGIN = origin;
    process.env.JWT_SECRET = 'journey-test-secret-at-least-32-characters';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.API_PREFIX = 'api';
    process.env.HOST = '127.0.0.1';
    process.env.PORT = '3001';
    // Import only after the isolated test environment is set; CI has no local .env.
    appModule = (await import('../src/app.module')).AppModule;
    const module = await Test.createTestingModule({ imports: [appModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    if (prisma) {
      const users = await prisma.user.findMany({
        where: { email: { in: [emailA, emailB, raceEmail] } },
        select: { id: true },
      });
      const ownerId = { in: users.map((user) => user.id) };
      await prisma.$transaction([
        prisma.task.deleteMany({ where: { project: { ownerId } } }),
        prisma.project.deleteMany({ where: { ownerId } }),
        prisma.user.deleteMany({ where: { id: ownerId } }),
      ]);
    }
    await app?.close();
  });

  it('requires login on every private endpoint', async () => {
    for (const path of [
      '/api/auth/me',
      '/api/projects',
      `/api/projects/${randomUUID()}`,
      `/api/projects/${randomUUID()}/tasks`,
      '/api/dashboard',
    ]) {
      await request(server).get(path).expect(401);
    }
    await post('/api/projects').send({ name: 'Private' }).expect(401);
    await post(`/api/projects/${randomUUID()}/tasks`).send({ title: 'Private' }).expect(401);
    await request(server)
      .patch(`/api/tasks/${randomUUID()}/status`)
      .set('Origin', origin)
      .send({ status: 'DONE' })
      .expect(401);
  });
  it('rejects missing or hostile origins before writes', async () => {
    await request(server).post('/api/auth/register').send({ email: emailA, password }).expect(403);
    await request(server)
      .post('/api/auth/login')
      .set('Origin', 'https://hostile.test')
      .send({ email: emailA, password })
      .expect(403);
  });
  it('validates registration and rejects bcrypt byte truncation', async () => {
    for (const data of [
      { email: 'bad', password },
      { email: emailA, password: 'short' },
      { email: emailA, password, ownerId: randomUUID() },
      { email: emailA, password: 'é'.repeat(40) },
    ]) {
      await post('/api/auth/register').send(data).expect(400);
    }
  });
  it('registers, normalizes email, sets a private cookie and hashes passwords', async () => {
    const response = await post('/api/auth/register')
      .send({ email: `  ${emailA.toUpperCase()}  `, password })
      .expect(201);
    cookieA = cookieFrom(response);
    userA = response.body.id as string;
    expect(response.body.email).toBe(emailA);
    expect(Object.keys(response.body).sort()).toEqual(['createdAt', 'email', 'id']);
    const header = (response.headers['set-cookie'] as unknown as string[])[0];
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userA } });
    expect(user.passwordHash).not.toBe(password);
    expect(await compare(password, user.passwordHash)).toBe(true);
    await get('/api/auth/me').expect(200, response.body);
    const second = await post('/api/auth/register').send({ email: emailB, password }).expect(201);
    cookieB = cookieFrom(second);
    userB = second.body.id as string;
  });
  it('handles duplicate registration races and wrong credentials', async () => {
    await post('/api/auth/register').send({ email: emailA, password }).expect(409);
    await post('/api/auth/login').send({ email: emailA, password: 'wrong-password' }).expect(401);
    await post('/api/auth/login')
      .send({ email: `missing-${suffix}@example.test`, password })
      .expect(401);
    const attempts = await Promise.all([
      post('/api/auth/register').send({ email: raceEmail, password }),
      post('/api/auth/register').send({ email: raceEmail, password }),
    ]);
    expect(attempts.map((response) => response.status).sort()).toEqual([201, 409]);
  });
  it('returns empty collections and zero statistics for a new account', async () => {
    await get('/api/projects').expect(200, []);
    const dashboard = await get('/api/dashboard').expect(200);
    expect(dashboard.body).toEqual({
      totalProjects: 0,
      totalTasks: 0,
      todoTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      recentProjects: [],
      pendingTasks: [],
    });
  });
  it('creates a trimmed project and persists it across new HTTP requests', async () => {
    for (const name of ['', '   ', 'x'.repeat(101), 42])
      await post('/api/projects', cookieA).send({ name }).expect(400);
    await post('/api/projects', cookieA).send({ name: 'Injected', ownerId: userB }).expect(400);
    const response = await post('/api/projects', cookieA)
      .send({ name: '  Main project  ' })
      .expect(201);
    projectId = response.body.id as string;
    expect(response.body).toMatchObject({
      name: 'Main project',
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
    });
    expect(response.body.ownerId).toBeUndefined();
    const listed = await get('/api/projects').expect(200);
    expect(listed.body).toEqual([response.body]);
    await get(`/api/projects/${projectId}`).expect(200);
  });
  it('isolates project reads and task writes between accounts', async () => {
    await get('/api/projects', cookieB).expect(200, []);
    await get(`/api/projects/${projectId}`, cookieB).expect(404);
    await get(`/api/projects/${projectId}/tasks`, cookieB).expect(404);
    await post(`/api/projects/${projectId}/tasks`, cookieB).send({ title: 'Intruder' }).expect(404);
    await get(`/api/projects/${randomUUID()}`).expect(404);
    await get('/api/projects/invalid-id').expect(400);
  });
  it('validates tasks, creates TODO by default and filters results', async () => {
    await get(`/api/projects/${projectId}/tasks`).expect(200, []);
    for (const data of [
      { title: ' ' },
      { title: 'x'.repeat(101) },
      { title: 'Test', description: 'x'.repeat(1001) },
      { title: 'Test', status: 'DONE' },
      { title: 'Test', description: null },
    ]) {
      await post(`/api/projects/${projectId}/tasks`, cookieA).send(data).expect(400);
    }
    const response = await post(`/api/projects/${projectId}/tasks`, cookieA)
      .send({ title: '  First task  ', description: '  Details  ' })
      .expect(201);
    taskId = response.body.id as string;
    expect(response.body).toMatchObject({
      title: 'First task',
      description: 'Details',
      status: 'TODO',
      projectId,
    });
    await get(`/api/projects/${projectId}/tasks?status=TODO`).expect(200, [response.body]);
    await get(`/api/projects/${projectId}/tasks?status=DONE`).expect(200, []);
    await get(`/api/projects/${projectId}/tasks?status=INVALID`).expect(400);
    await get(`/api/projects/${projectId}/tasks?ownerId=${userB}`).expect(400);
  });
  it('enforces task ownership and atomically updates status', async () => {
    await patch(`/api/tasks/${taskId}/status`, cookieB).send({ status: 'DONE' }).expect(404);
    await patch(`/api/tasks/${randomUUID()}/status`).send({ status: 'DONE' }).expect(404);
    await patch(`/api/tasks/${taskId}/status`).send({ status: 'INVALID' }).expect(400);
    await patch(`/api/tasks/${taskId}/status`)
      .send({ status: 'DONE', projectId: randomUUID() })
      .expect(400);
    await patch(`/api/tasks/${taskId}/status`).send({ status: 'IN_PROGRESS' }).expect(200);
    const dashboard = await get('/api/dashboard').expect(200);
    expect(dashboard.body).toMatchObject({ totalTasks: 1, inProgressTasks: 1, completedTasks: 0 });
    expect(dashboard.body.pendingTasks[0].id).toBe(taskId);
    await patch(`/api/tasks/${taskId}/status`).send({ status: 'DONE' }).expect(200);
    const detail = await get(`/api/projects/${projectId}`).expect(200);
    expect(detail.body).toMatchObject({
      totalTasks: 1,
      completedTasks: 1,
      progress: 100,
      todoTasks: 0,
      inProgressTasks: 0,
    });
    await get(`/api/projects/${projectId}/tasks?status=TODO`).expect(200, []);
  });
  it('bounds dashboard lists and keeps counts consistent and owner-scoped', async () => {
    for (let i = 0; i < 3; i++)
      await post('/api/projects', cookieA)
        .send({ name: `Extra ${i}` })
        .expect(201);
    for (let i = 0; i < 6; i++)
      await post(`/api/projects/${projectId}/tasks`, cookieA)
        .send({ title: `Pending ${i}` })
        .expect(201);
    const dashboard = await get('/api/dashboard').expect(200);
    expect(dashboard.body).toMatchObject({
      totalProjects: 4,
      totalTasks: 7,
      todoTasks: 6,
      inProgressTasks: 0,
      completedTasks: 1,
    });
    expect(dashboard.body.recentProjects).toHaveLength(3);
    expect(dashboard.body.pendingTasks).toHaveLength(5);
    expect(
      dashboard.body.pendingTasks.every((task: { status: string }) => task.status !== 'DONE'),
    ).toBe(true);
    const other = await get('/api/dashboard', cookieB).expect(200);
    expect(other.body.totalProjects).toBe(0);
    expect(other.body.totalTasks).toBe(0);
    const detail = await get(`/api/projects/${projectId}`).expect(200);
    expect(detail.body).toMatchObject({ totalTasks: 7, completedTasks: 1, progress: 14 });
  });
  it('rejects forged, JWT-expired and database-expired sessions', async () => {
    await get('/api/auth/me', 'miniflow_session=forged').expect(401);
    const session = await prisma.session.findFirstOrThrow({ where: { userId: userB } });
    const expiredToken = await app
      .get(JwtService)
      .signAsync({ sub: userB, sid: session.id }, { expiresIn: -1 });
    await get('/api/auth/me', `miniflow_session=${expiredToken}`).expect(401);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(0) } });
    await get('/api/auth/me', cookieB).expect(401);
  });
  it('uses secure cookies in production', () => {
    const configuration = app.get(ConfigService);
    configuration.set('NODE_ENV', 'production');
    expect(app.get(AuthService).cookieOptions.secure).toBe(true);
    configuration.set('NODE_ENV', 'test');
  });
  it('logs out, revokes replay, and allows a new login with retained data', async () => {
    const response = await post('/api/auth/logout', cookieA).expect(204);
    expect((response.headers['set-cookie'] as unknown as string[])[0]).toContain(
      'Expires=Thu, 01 Jan 1970',
    );
    await get('/api/auth/me', cookieA).expect(401);
    await post('/api/auth/logout', cookieA).expect(204);
    const login = await post('/api/auth/login').send({ email: emailA, password }).expect(200);
    cookieA = cookieFrom(login);
    await get('/api/auth/me').expect(200);
    const listed = await get('/api/projects').expect(200);
    expect(listed.body).toHaveLength(4);
    expect(await prisma.session.count({ where: { userId: userA } })).toBe(1);
    await request(server).get('/api/health').expect(200);
  });
  it('retains sessions and business data after the backend restarts', async () => {
    await app.close();
    const module = await Test.createTestingModule({ imports: [appModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    const me = await get('/api/auth/me').expect(200);
    expect(me.body.id).toBe(userA);
    const detail = await get(`/api/projects/${projectId}`).expect(200);
    expect(detail.body).toMatchObject({ totalTasks: 7, completedTasks: 1, progress: 14 });
  });
});
