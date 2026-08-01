import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller.js";
import { WidgetSessionModule } from "./widget-session/widget-session.module.js";

@Module({
  imports: [WidgetSessionModule],
  controllers: [HealthController]
})
export class AppModule {}
