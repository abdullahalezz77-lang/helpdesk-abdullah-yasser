import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        message = obj.message || obj.error || message;
        if (Array.isArray(obj.message)) {
          message = obj.message.join(', ');
          details = obj.message;
        }
        code = obj.code || this.mapStatusToCode(status);
        if (obj.details) details = obj.details;
      }
    } else if (exception instanceof Error) {
      if (exception.name === 'InvalidStatusTransitionError') {
        status = HttpStatus.BAD_REQUEST;
        code = 'INVALID_STATUS_TRANSITION';
        message = exception.message;
      } else {
        this.logger.error(`Unhandled Exception at ${request.method} ${request.url}:`, exception.stack);
      }
    }

    // Do not leak stack traces or internal secrets
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
