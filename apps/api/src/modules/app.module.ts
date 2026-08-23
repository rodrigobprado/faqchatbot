import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { CoreModule } from "./core/core.module.js";
import { HealthController } from "./health/health.controller.js";
import { PlansModule } from "./plans/plans.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { TenantsModule } from "./tenants/tenants.module.js";
import { WidgetModule } from "./widget/widget.module.js";

@Module({
  imports: [CoreModule, AuthModule, TenantsModule, WidgetModule, ChatModule, PlansModule, StorageModule],
  controllers: [HealthController]
})
export class AppModule {}

