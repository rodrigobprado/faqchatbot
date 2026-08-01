import "reflect-metadata";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor.js";
import { createCorsOriginResolver } from "./common/cors.js";
import { AppModule } from "./modules/app.module.js";

const bootstrap = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook("onRequest", (request, reply, done) => {
    const headerId = request.headers["x-correlation-id"];
    const correlationId =
      typeof headerId === "string" && headerId.trim() ? headerId : randomUUID();

    (request as typeof request & { correlationId?: string }).correlationId = correlationId;
    reply.header("x-correlation-id", correlationId);
    done();
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: createCorsOriginResolver(process.env.CORS_ORIGINS),
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  const config = new DocumentBuilder()
    .setTitle("faqchatbot API")
    .setDescription("Embeddable AI Platform API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen({ host: "0.0.0.0", port });
};

void bootstrap();
