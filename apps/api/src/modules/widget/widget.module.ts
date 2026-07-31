import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { WidgetSessionController } from "./widget-session.controller.js";
import { WidgetSessionService } from "./widget-session.service.js";

@Module({
  imports: [JwtModule.register({}), RateLimitModule],
  controllers: [WidgetSessionController],
  providers: [WidgetSessionService]
})
export class WidgetModule {}
