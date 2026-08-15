import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { DatabaseService } from "../../db/database.service.js";

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
  constructor(private readonly databaseService: DatabaseService) {}

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
          required: ["database"],
          properties: {
            database: { type: "string", example: "ok" }
          }
        }
      }
    }
  })
  async getHealth(): Promise<HealthResponse> {
    await this.databaseService.ping();

    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok"
      }
    };
  }
}
