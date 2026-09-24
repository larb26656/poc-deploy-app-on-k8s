import {
  HttpService,
} from '@nestjs/axios';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Item } from '../items/item.entity';

const SEED_ITEMS: Array<Partial<Item>> = [
  {
    name: 'Mechanical Keyboard',
    description: '75% hot-swappable keyboard with brown switches',
    price: '3490.00',
  },
  {
    name: 'USB-C Docking Station',
    description: '12-in-1 dual HDMI dock for laptops',
    price: '2150.00',
  },
  {
    name: '27-inch 4K Monitor',
    description: 'IPS 144Hz productivity monitor',
    price: '12800.00',
  },
];

@Injectable()
export class CatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogService.name);
  private readonly availabilityBaseUrl: string;

  constructor(
    @InjectRepository(Item)
    private readonly items: Repository<Item>,
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.availabilityBaseUrl = config.get<string>(
      'AVAILABILITY_SERVICE_BASE_URL',
      'http://127.0.0.1:43118',
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.seedItemsIfEmpty();
  }

  listItems(): Promise<Item[]> {
    return this.items.find({ order: { createdAt: 'ASC' } });
  }

  async getAvailability(requestId?: string): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (requestId) {
      headers['x-request-id'] = requestId;
    }

    const { data } = await firstValueFrom(
      this.http.get(`${this.availabilityBaseUrl}/api/v1/internal/availability`, {
        headers,
        timeout: 5_000,
      }),
    );
    return data;
  }

  private async seedItemsIfEmpty(): Promise<void> {
    const count = await this.items.count();
    if (count > 0) {
      this.logger.log(`items table already has ${count} rows, skipping seed`);
      return;
    }

    await this.items.save(SEED_ITEMS);
    this.logger.log(`seeded ${SEED_ITEMS.length} items`);
  }
}
