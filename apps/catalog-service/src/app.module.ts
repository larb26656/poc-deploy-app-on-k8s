import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { Item } from './items/item.entity';
import { HealthController } from './health/health.controller';
import { CatalogModule } from './catalog/catalog.module';

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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', '127.0.0.1'),
        port: config.get<number>('DATABASE_PORT', 45432),
        username: config.get<string>('DATABASE_USER', 'catalog_app'),
        password: config.get<string>('DATABASE_PASSWORD', 'catalog_secret'),
        database: config.get<string>('DATABASE_NAME', 'catalog_db'),
        entities: [Item],
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    CatalogModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
