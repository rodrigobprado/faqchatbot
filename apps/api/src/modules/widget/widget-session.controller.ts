import type { WidgetSessionStartRequest } from "@faqchatbot/contracts";
import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
// NestJS's emitDecoratorMetadata needs a real (non `import type`) reference to
// resolve DI/ValidationPipe metatypes at runtime for these classes.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WidgetSessionStartDto } from "./dto/widget-session-start.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WidgetSessionService } from "./widget-session.service.js";

@ApiTags("widget")
@Controller("v1/widget")
export class WidgetSessionController {
  constructor(private readonly widgetSessionService: WidgetSessionService) {}

  @Post("session/start")
  @HttpCode(HttpStatus.OK)
  start(
    @Body() body: WidgetSessionStartDto,
    @Headers("origin") origin: string | undefined,
    @Headers("referer") referer: string | undefined,
    @Ip() clientIp: string,
  ) {
    return this.widgetSessionService.start(body as WidgetSessionStartRequest, origin, referer, clientIp);
  }
}
