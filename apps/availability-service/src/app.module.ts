import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './health/health.controller';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id'];
          const id =
            typeof incoming === 'string' && incoming.trim() !== ''
              ? incoming
              : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    AvailabilityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
