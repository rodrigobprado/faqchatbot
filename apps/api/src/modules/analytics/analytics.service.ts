import { EventEmitter } from "node:events";
import type { InternalEvent } from "@faqchatbot/contracts";
import { createLogger } from "@faqchatbot/logger";
import { Inject, Injectable } from "@nestjs/common";
import type { Database } from "../../db/client.js";
import { createAnalyticsEventsRepository } from "../../db/repositories/analytics-events.repository.js";
import { DATABASE } from "../core/core.module.js";

const EVENT_CHANNEL = "internal-event";

type TenantScopedEvent = InternalEvent & { tenantId: string };

const extractConversationId = (event: InternalEvent): string | undefined =>
  "conversationId" in event ? event.conversationId : undefined;

@Injectable()
export class AnalyticsService {
  private readonly bus = new EventEmitter();
  private readonly logger = createLogger("analytics");

  constructor(@Inject(DATABASE) private readonly db: Database) {
    this.bus.on(EVENT_CHANNEL, (event: TenantScopedEvent) => {
      void this.persist(event);
    });
  }

  /**
   * Emits an internal analytics event for asynchronous persistence.
   * Never throws and never blocks the caller: failures are logged, not propagated.
   */
  record(event: InternalEvent): void {
    if (!event.tenantId) {
      this.logger.warn("analytics_event_dropped_no_tenant", { type: event.type });
      return;
    }

    this.bus.emit(EVENT_CHANNEL, event);
  }

  private async persist(event: TenantScopedEvent): Promise<void> {
    try {
      await createAnalyticsEventsRepository(this.db).record({
        tenantId: event.tenantId,
        conversationId: extractConversationId(event),
        eventType: event.type,
        payload: event
      });
    } catch (error) {
      this.logger.warn("analytics_event_persist_failed", {
        type: event.type,
        reason: error instanceof Error ? error.message : "unknown"
      });
    }
  }
}
