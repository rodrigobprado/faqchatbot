import "reflect-metadata";

import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { createLogger } from "@faqchatbot/logger";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { RawRequestDefaultExpression, RawServerDefault } from "fastify";
import { HttpExceptionFilter } from "./common/http-exception.filter.js";
import { ResponseEnvelopeInterceptor } from "./common/response-envelope.interceptor.js";
import { AppModule } from "./modules/app.module.js";

const bootstrap = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      genReqId: (request: RawRequestDefaultExpression<RawServerDefault>) => {
        const incoming = request.headers["x-correlation-id"];
        return typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
      }
    }),
  );

  app.getHttpAdapter().getInstance().addHook("onSend", async (request, reply) => {
    reply.header("x-correlation-id", request.id);
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(createLogger("api")));
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

