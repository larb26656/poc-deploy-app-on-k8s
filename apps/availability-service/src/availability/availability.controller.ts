import { Controller, Get } from '@nestjs/common';

export interface AvailabilityResponse {
  status: 'available';
  service: string;
  checkedAt: string;
}

@Controller('internal/availability')
export class AvailabilityController {
  @Get()
  getAvailability(): AvailabilityResponse {
    return {
      status: 'available',
      service: 'availability-service',
      checkedAt: new Date().toISOString(),
    };
  }
}
