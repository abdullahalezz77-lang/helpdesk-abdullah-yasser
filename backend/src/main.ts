import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security Headers via Helmet
  app.use(helmet());

  // Cookie Parser
  const cookieSecret = process.env.COOKIE_SECRET || 'helpdesk-cookie-secret';
  app.use(cookieParser(cookieSecret));

  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global API Prefix
  app.setGlobalPrefix('api');

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger / OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('HelpDesk Lite API')
    .setDescription(
      'Production-ready internal support request ticketing API with role-based access control (Employee, Support, Manager) and state machine lifecycle management.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`HelpDesk Lite API running on: http://localhost:${port}/api`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
