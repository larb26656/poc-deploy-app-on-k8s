import { Controller, Get, Headers } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('items')
  listItems() {
    return this.catalog.listItems();
  }

  @Get('availability')
  availability(@Headers('x-request-id') requestId?: string) {
    return this.catalog.getAvailability(requestId);
  }
}
