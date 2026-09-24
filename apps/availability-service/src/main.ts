import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 43118);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`availability-service listening on :${port}`);
}

void bootstrap();
