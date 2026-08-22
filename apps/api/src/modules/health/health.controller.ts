import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { DATABASE } from "../core/core.module.js";

export type HealthResponse = Readonly<{
  status: "ok";
  service: "api";
  timestamp: string;
  checks: Readonly<{
    database: "ok";
  }>;
}>;

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["status", "service", "timestamp", "checks"],
      properties: {
        status: { type: "string", example: "ok" },
        service: { type: "string", example: "api" },
        timestamp: { type: "string", format: "date-time" },
        checks: {
          type: "object",
          properties: {
            database: { type: "string", example: "ok" }
          }
        }
      }
    }
  })
  @ApiServiceUnavailableResponse({ description: "Database unreachable" })
  async getHealth(): Promise<HealthResponse> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        service: "api",
        timestamp: new Date().toISOString(),
        checks: { database: "error" }
      });
    }

    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
      checks: { database: "ok" }
    };
  }
}
