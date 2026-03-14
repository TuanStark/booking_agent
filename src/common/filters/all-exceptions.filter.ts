import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      // Handle specific error types
      if (exception.name === 'CastError') {
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found';
      } else if ((exception as any).code === 11000) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Duplicate field value entered';
      } else if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Validation error';
      } else if ((exception as any).isJoi) {
        status = HttpStatus.BAD_REQUEST;
        message = (exception as any).details?.map((detail: any) => detail.message).join(', ') || 'Validation error';
      } else if ((exception as any).code === 'ECONNREFUSED' || (exception as any).code === 'ENOTFOUND') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'External service unavailable';
      } else if ((exception as any).status === 429) {
        status = HttpStatus.TOO_MANY_REQUESTS;
        message = 'Too many requests, please try again later';
      } else {
        message = exception.message || 'Internal server error';
      }
    }

    // Log the error
    this.logger.error('Exception caught', {
      message: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('User-Agent'),
      statusCode: status,
    });

    // Send error response
    const errorResponse = {
      success: false,
      error: {
        message,
        statusCode: status,
        ...(process.env.NODE_ENV === 'development' && 
            exception instanceof Error && { stack: exception.stack }),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
