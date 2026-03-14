import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as Joi from 'joi';
import { SuperAgentModule } from './modules/super-agent/super-agent.module';
import { HealthModule } from './modules/health/health.module';
import { CoreModule } from './modules/core/core.module';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),

        // OpenAI Configuration
        OPENAI_API_KEY: Joi.string().required(),
        OPENAI_MODEL: Joi.string().default('gpt-4o'),

        // MCP Configuration
        MCP_SERVER_PATH: Joi.string().default('./mcp-servers/hasura-advanced'),
        MCP_TIMEOUT: Joi.number().default(30000),

        // Rate Limiting
        RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
        RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

        // Logging
        LOG_LEVEL: Joi.string()
          .valid('error', 'warn', 'info', 'debug')
          .default('info'),

        // CORS
        CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

        // Cache
        CACHE_TTL: Joi.number().default(1800), // 30 minutes
        CACHE_MAX_ITEMS: Joi.number().default(1000),
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
            limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
          },
        ],
      }),
    }),

    // Cache module
    CacheModule.register({
      isGlobal: true,
      ttl: parseInt(process.env.CACHE_TTL) || 1800,
      max: parseInt(process.env.CACHE_MAX_ITEMS) || 1000,
    }),

    // Winston logger
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'real-estate-chatbot-agent-nestjs',
        version: '2.0.0'
      },
      transports: [
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/app.log'
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    }),

    // Feature modules
    CoreModule,
    SuperAgentModule,
    HealthModule,
  ],
})
export class AppModule { }
