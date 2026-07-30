import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

export type HealthResponse = Readonly<{
  status: "ok";
  service: "api";
  timestamp: string;
}>;

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["status", "service", "timestamp"],
      properties: {
        status: { type: "string", example: "ok" },
        service: { type: "string", example: "api" },
        timestamp: { type: "string", format: "date-time" }
      }
    }
  })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString()
    };
  }
}

