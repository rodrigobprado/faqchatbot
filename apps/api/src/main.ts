import "reflect-metadata";

import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import { corsExtraOrigins, type PlatformEnvironment } from "@faqchatbot/config";
import { createLogger } from "@faqchatbot/logger";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { RawRequestDefaultExpression, RawServerDefault } from "fastify";
import { buildCorsOriginValidator } from "./common/dynamic-origin.js";
import { HttpExceptionFilter } from "./common/http-exception.filter.js";
import { ResponseEnvelopeInterceptor } from "./common/response-envelope.interceptor.js";
import type { Database } from "./db/client.js";
import { createTenantDomainsRepository } from "./db/repositories/tenant-domains.repository.js";
import { AppModule } from "./modules/app.module.js";
import { DATABASE, ENV } from "./modules/core/core.module.js";

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
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1
    }
  });

  const env = app.get<PlatformEnvironment>(ENV as never);
  const db = app.get<Database>(DATABASE as never);

  await app.register(cors, {
    origin: buildCorsOriginValidator(
      () => createTenantDomainsRepository(db).listActiveTenantHostnames(),
      corsExtraOrigins(env),
    ),
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
