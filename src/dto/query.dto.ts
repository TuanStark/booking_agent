import { IsString, IsUUID, IsOptional, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryRequestDto {
  @ApiProperty({
    description: 'User query for real estate search',
    example: 'Tìm căn hộ 2 phòng ngủ tại Hải Châu giá dưới 5 tỷ',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  query: string;

  @ApiPropertyOptional({
    description: 'Session ID for conversation continuity',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Additional context for the query',
    example: { previousQuery: 'Tìm nhà ở Đà Nẵng' },
  })
  @IsOptional()
  context?: any;
}

export class QueryResponseDto {
  @ApiProperty({
    description: 'Whether the query was processed successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'AI-generated response to the user query',
    example: 'Tôi đã tìm được 5 căn hộ phù hợp với yêu cầu của bạn...',
  })
  response: string;

  @ApiProperty({
    description: 'Session ID used for this query',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Search results from the database',
    type: 'array',
    items: {
      type: 'object',
    },
  })
  results?: any[];

  @ApiPropertyOptional({
    description: 'Query analysis information',
    example: {
      query: 'Tìm căn hộ...',
      intent: 'search',
      confidence: 1,
    },
  })
  query?: {
    query: string;
    intent: string;
    confidence: number;
  };

  @ApiPropertyOptional({
    description: 'Processing metadata',
    example: {
      duration: 5000,
      aiService: 'OpenAI',
      model: 'gpt-4o',
      toolsUsed: ['search_properties'],
    },
  })
  metadata?: {
    duration: number;
    aiService: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    intelligenceLevel?: string;
    toolsUsed: string[];
    toolCount: number;
    dataSource: string;
    agentCapability: string;
    originalError?: string;
    responseValidation?: {
      isValid: boolean;
      warningCount: number;
      errorCount: number;
    };
  };
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Error message',
    example: 'Query is required and must be a non-empty string',
  })
  error: string;

  @ApiPropertyOptional({
    description: 'Additional error details',
    example: 'Validation failed',
  })
  message?: string;
}

// Complexity Analysis DTOs
export class ComplexityAnalysisRequestDto {
  @ApiProperty({
    description: 'Query text to analyze for complexity',
    example: 'Tìm căn hộ 2 phòng ngủ tại Hải Châu với giá dưới 3 tỷ'
  })
  @IsString()
  @IsNotEmpty()
  query: string;
}

export class ComplexityAnalysisResponseDto {
  @ApiProperty({ description: 'Whether the analysis was successful' })
  success: boolean;

  @ApiProperty({
    description: 'Complexity analysis results',
    required: false
  })
  analysis?: {
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

  @ApiProperty({
    description: 'Error information if analysis failed',
    required: false
  })
  error?: string;
}
