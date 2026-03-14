import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';

import { SuperAgentService } from '../services/super-agent.service';
import { RealEstateOpenAIService } from '../services/real-estate-openai.service';
import {
  QueryRequestDto,
  QueryResponseDto,
  ErrorResponseDto,
} from '../../../dto/query.dto';

@ApiTags('super-agent')
@Controller('super-agent')
@UseGuards(ThrottlerGuard)
export class SuperAgentController {
  private readonly logger = new Logger(SuperAgentController.name);

  constructor(
    private readonly superAgentService: SuperAgentService,
    private readonly realEstateOpenAIService: RealEstateOpenAIService,
  ) {}

  @Post('query')
  @ApiOperation({
    summary: 'Process user query',
    description: 'Process natural language query and return AI-generated response with property search results',
  })
  @ApiBody({ type: QueryRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Query processed successfully',
    type: QueryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async processQuery(
    @Body() queryDto: QueryRequestDto,
    @Req() request: Request,
  ): Promise<QueryResponseDto> {
    try {
      this.logger.log('Super Agent query received', {
        query: queryDto.query.substring(0, 50),
        sessionId: queryDto.sessionId,
        hasContext: !!queryDto.context
      });

      // Process query with Super Intelligent Agent - following Express logic
      const result = await this.superAgentService.processQuery(
        queryDto.query,
        queryDto.sessionId
      );

      return result;
    } catch (error) {
      this.logger.error('Query processing failed', {
        error: error.message,
        query: queryDto.query.substring(0, 100) + '...',
      });

      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to process query',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get agent status',
    description: 'Get current status and health information of the Super Intelligent Agent',
  })
  async getStatus(): Promise<any> {
    try {
      this.logger.log('Status check requested');
      
      return {
        success: true,
        agent: {
          name: 'Super Intelligent Real Estate Agent',
          version: '2.0.0',
          intelligenceLevel: 'SUPER_ADVANCED',
          status: 'online'
        },
        services: {
          openai: {
            available: true,
            model: 'gpt-4o'
          },
          mcp: this.superAgentService.getMcpToolsInfo(),
          knowledgeBase: this.realEstateOpenAIService.getKnowledgeStatus()
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      };
    } catch (error) {
      this.logger.error('Status check failed', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve agent status',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Simple health check endpoint',
  })
  async healthCheck(): Promise<any> {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      agent: 'Super Intelligent Real Estate Agent',
      version: '2.0.0'
    };
  }

  @Get('mcp/tools')
  @ApiOperation({
    summary: 'Get MCP tools',
    description: 'Get available MCP tools and their information',
  })
  async getMcpTools(): Promise<any> {
    try {
      this.logger.log('MCP tools requested');
      
      const mcpInfo = this.superAgentService.getMcpToolsInfo();
      
      return {
        success: true,
        data: mcpInfo
      };
    } catch (error) {
      this.logger.error('Failed to get MCP tools', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve MCP tools',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
