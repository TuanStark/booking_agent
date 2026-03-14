import { Controller, Get, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { HealthResponseDto } from '../../../dto/health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Simple health check endpoint to verify service is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    this.logger.debug('Health check requested');

    return {
      success: true,
      status: 'healthy',
      agent: 'Super Intelligent Real Estate Agent (NestJS)',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
