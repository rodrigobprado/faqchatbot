import { Module } from "@nestjs/common";
import { DatabaseModule } from "../db/database.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { HealthController } from "./health/health.controller.js";
import { TenantsModule } from "./tenants/tenants.module.js";
import { WidgetSessionModule } from "./widget-session/widget-session.module.js";

@Module({
  imports: [DatabaseModule, WidgetSessionModule, AuthModule, TenantsModule, ChatModule],
  controllers: [HealthController]
})
export class AppModule {}
