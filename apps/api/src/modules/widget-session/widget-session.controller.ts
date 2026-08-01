import { Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { WidgetSessionService } from "./widget-session.service.js";

@ApiTags("widget-session")
@Controller("v1/widget/session")
export class WidgetSessionController {
  constructor(@Inject(WidgetSessionService) private readonly widgetSessionService: WidgetSessionService) {}

  @Post("start")
  @ApiOkResponse({ description: "Starts or resumes a widget session" })
  start(
    @Body() body: unknown,
    @Headers("origin") origin?: string,
    @Headers("referer") referer?: string,
  ) {
    return this.widgetSessionService.start(body, { origin, referer });
  }
}
