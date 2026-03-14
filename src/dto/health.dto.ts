import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Whether the service is healthy',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Health status',
    example: 'healthy',
  })
  status: string;

  @ApiProperty({
    description: 'Service name',
    example: 'Super Intelligent Real Estate Agent',
  })
  agent: string;

  @ApiProperty({
    description: 'Service version',
    example: '2.0.0',
  })
  version: string;

  @ApiProperty({
    description: 'Timestamp of health check',
    example: '2025-08-04T04:55:13.995Z',
  })
  timestamp: string;
}

export class StatusResponseDto {
  @ApiProperty({
    description: 'Whether the status check was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Service status',
    example: 'operational',
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp of status check',
    example: '2025-08-04T04:55:13.995Z',
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Cache service statistics',
    example: {
      status: 'available',
      size: 150,
      maxSize: 1000,
      estimatedMemoryMB: 25.5,
    },
  })
  cache?: {
    status: string;
    size: number;
    maxSize: number;
    estimatedMemoryMB: number;
    maxMemoryMB: number;
    keys: string[];
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  };

  @ApiPropertyOptional({
    description: 'OpenAI service status',
    example: {
      status: 'available',
      model: 'gpt-4o',
      apiKeyConfigured: true,
    },
  })
  openai?: {
    status: string;
    model: string;
    apiKeyConfigured: boolean;
  };

  @ApiPropertyOptional({
    description: 'MCP service status',
    example: {
      status: 'connected',
      serverPath: './mcp-servers/hasura-advanced',
    },
  })
  mcp?: {
    status: string;
    connected: boolean;
    serverPath: string;
  };

  @ApiPropertyOptional({
    description: 'System information',
    example: {
      nodeVersion: 'v18.17.0',
      platform: 'linux',
      uptime: 3600,
      memoryUsage: {
        rss: 150.5,
        heapUsed: 75.2,
        heapTotal: 120.8,
      },
    },
  })
  system?: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  };
}

export class ComplexityAnalysisRequestDto {
  @ApiProperty({
    description: 'Query to analyze complexity',
    example: 'Tôi muốn đầu tư bất động sản tại Đà Nẵng với ngân sách 2 tỷ',
  })
  query: string;
}

export class ComplexityAnalysisResponseDto {
  @ApiProperty({
    description: 'Whether the analysis was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Query complexity analysis',
    example: {
      query: 'Tôi muốn đầu tư...',
      complexity: {
        level: 'COMPLEX',
        score: 3,
        needsKnowledgeBase: true,
        indicators: ['đầu tư', 'ngân sách'],
      },
      processing: {
        duration: 150,
        timestamp: '2025-08-04T04:55:13.995Z',
      },
    },
  })
  analysis: {
    query: string;
    complexity: {
      level: string;
      score: number;
      needsKnowledgeBase: boolean;
      indicators: string[];
    };
    processing: {
      duration: number;
      timestamp: string;
    };
  };
}
