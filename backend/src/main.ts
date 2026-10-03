import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './config/configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow<number>('PORT'), config.getOrThrow<string>('HOST'));
}

void bootstrap().catch(() => {
  Logger.error(
    'Backend startup failed. Check configuration and service availability.',
    'Bootstrap',
  );
  process.exitCode = 1;
});
