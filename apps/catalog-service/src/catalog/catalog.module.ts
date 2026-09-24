import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from '../items/item.entity';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([Item]), HttpModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
