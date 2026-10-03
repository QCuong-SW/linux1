import { Controller, INestApplication, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import type { Server } from 'node:http';
import { ServiceUnavailableException } from '@nestjs/common';
import { configureApp } from '../src/config/configure-app';
import { HealthModule } from '../src/modules/health/health.module';
import { HealthService } from '../src/modules/health/health.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

class ProbeDto {
  @IsString()
  name!: string;
}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() dto: ProbeDto) {
    return dto;
  }
}

describe('HTTP foundation', () => {
  let app: INestApplication;
  let server: Server;
  const check = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [HealthModule],
      controllers: [ProbeController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({
            API_PREFIX: 'api',
            FRONTEND_ORIGIN: 'http://localhost:3000',
          }),
        },
      ],
    })
      .overrideProvider(HealthService)
      .useValue({ check })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('exposes public health under the API prefix with credentialed CORS', async () => {
    check.mockResolvedValueOnce({ status: 'ok', database: 'up' });
    const response = await request(server)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    await request(server).get('/health').expect(404);
  });

  it('reports database unavailability as 503', async () => {
    check.mockRejectedValueOnce(
      new ServiceUnavailableException({ status: 'error', database: 'down' }),
    );
    const response = await request(server).get('/api/health').expect(503);
    expect(response.body).toEqual({ status: 'error', database: 'down' });
  });

  it('does not grant browser access to an unrelated origin', async () => {
    check.mockResolvedValueOnce({ status: 'ok', database: 'up' });
    const response = await request(server)
      .get('/api/health')
      .set('Origin', 'https://unrelated.example');
    expect(response.headers['access-control-allow-origin']).not.toBe('https://unrelated.example');
  });

  it('rejects unknown fields and incorrect DTO types', async () => {
    await request(server).post('/api/probe').send({ name: 'ok', ownerId: 'injected' }).expect(400);
    await request(server).post('/api/probe').send({ name: 42 }).expect(400);
    await request(server).post('/api/probe').send({ name: 'ok' }).expect(201, { name: 'ok' });
  });
});
