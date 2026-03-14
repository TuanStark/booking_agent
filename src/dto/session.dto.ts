import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionCleanupRequestDto {
  @ApiPropertyOptional({
    description: 'Reason for session cleanup',
    example: 'page_unload',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Force cleanup even if session is active',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class SessionCleanupResponseDto {
  @ApiProperty({
    description: 'Whether the cleanup was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Cleanup completion message',
    example: 'Session cleaned up successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Session cleanup statistics',
    example: {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      itemsRemoved: 3,
      reason: 'page_unload',
    },
  })
  stats?: {
    sessionId: string;
    itemsRemoved: number;
    reason: string;
  };
}

export class SessionsCleanupRequestDto {
  @ApiPropertyOptional({
    description: 'Force cleanup of all sessions',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class SessionsCleanupResponseDto {
  @ApiProperty({
    description: 'Whether the cleanup was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Cleanup completion message',
    example: 'Session cleanup completed',
  })
  message: string;

  @ApiProperty({
    description: 'Cleanup statistics',
    example: {
      totalSessions: 10,
      removedSessions: 3,
      remainingSessions: 7,
    },
  })
  stats: {
    totalSessions: number;
    removedSessions: number;
    remainingSessions: number;
  };
}
