import type { z } from "zod";
export declare const widgetSessionStartedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"WidgetSessionStarted">;
    visitorId: z.ZodString;
    sessionId: z.ZodString;
    conversationId: z.ZodString;
    origin: z.ZodOptional<z.ZodString>;
    pageUrl: z.ZodOptional<z.ZodString>;
    device: z.ZodOptional<z.ZodEnum<{
        unknown: "unknown";
        desktop: "desktop";
        mobile: "mobile";
        tablet: "tablet";
    }>>;
}, z.core.$strip>;
export declare const conversationStartedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"ConversationStarted">;
    conversationId: z.ZodString;
    sessionId: z.ZodString;
}, z.core.$strip>;
export declare const messageReceivedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"MessageReceived">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strip>;
export declare const agentRoutingStartedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AgentRoutingStarted">;
    conversationId: z.ZodString;
    provider: z.ZodEnum<{
        n8n: "n8n";
        openai_responses: "openai_responses";
        langgraph: "langgraph";
        flowise: "flowise";
        dify: "dify";
        crewai: "crewai";
        mcp: "mcp";
        custom: "custom";
    }>;
}, z.core.$strip>;
export declare const agentRoutingCompletedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AgentRoutingCompleted">;
    conversationId: z.ZodString;
    provider: z.ZodEnum<{
        n8n: "n8n";
        openai_responses: "openai_responses";
        langgraph: "langgraph";
        flowise: "flowise";
        dify: "dify";
        crewai: "crewai";
        mcp: "mcp";
        custom: "custom";
    }>;
    durationMs: z.ZodNumber;
}, z.core.$strip>;
export declare const agentRoutingFailedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AgentRoutingFailed">;
    conversationId: z.ZodString;
    provider: z.ZodEnum<{
        n8n: "n8n";
        openai_responses: "openai_responses";
        langgraph: "langgraph";
        flowise: "flowise";
        dify: "dify";
        crewai: "crewai";
        mcp: "mcp";
        custom: "custom";
    }>;
    reason: z.ZodString;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const assistantMessageStreamedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AssistantMessageStreamed">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strip>;
export declare const conversationEndedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"ConversationEnded">;
    conversationId: z.ZodString;
    reason: z.ZodOptional<z.ZodEnum<{
        resolved: "resolved";
        abandoned: "abandoned";
    }>>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const buttonClickedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"ButtonClicked">;
    conversationId: z.ZodString;
    buttonId: z.ZodString;
}, z.core.$strip>;
export declare const leadIdentifiedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"LeadIdentified">;
    conversationId: z.ZodString;
    visitorId: z.ZodString;
}, z.core.$strip>;
export declare const rateLimitExceededEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"RateLimitExceeded">;
    scope: z.ZodEnum<{
        ip: "ip";
        tenant: "tenant";
        api_key: "api_key";
        visitor: "visitor";
        conversation: "conversation";
    }>;
}, z.core.$strip>;
export declare const adminConfigChangedEventSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AdminConfigChanged">;
    actorUserId: z.ZodString;
    changedFields: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const internalEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"WidgetSessionStarted">;
    visitorId: z.ZodString;
    sessionId: z.ZodString;
    conversationId: z.ZodString;
    origin: z.ZodOptional<z.ZodString>;
    pageUrl: z.ZodOptional<z.ZodString>;
    device: z.ZodOptional<z.ZodEnum<{
        unknown: "unknown";
        desktop: "desktop";
        mobile: "mobile";
        tablet: "tablet";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"ConversationStarted">;
    conversationId: z.ZodString;
    sessionId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"MessageReceived">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AgentRoutingStarted">;
    conversationId: z.ZodString;
    provider: z.ZodEnum<{
        n8n: "n8n";
        openai_responses: "openai_responses";
        langgraph: "langgraph";
        flowise: "flowise";
        dify: "dify";
        crewai: "crewai";
        mcp: "mcp";
        custom: "custom";
    }>;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AgentRoutingCompleted">;
    conversationId: z.ZodString;
    provider: z.ZodEnum<{
        n8n: "n8n";
        openai_responses: "openai_responses";
        langgraph: "langgraph";
        flowise: "flowise";
        dify: "dify";
        crewai: "crewai";
        mcp: "mcp";
        custom: "custom";
    }>;
    durationMs: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AgentRoutingFailed">;
    conversationId: z.ZodString;
    provider: z.ZodEnum<{
        n8n: "n8n";
        openai_responses: "openai_responses";
        langgraph: "langgraph";
        flowise: "flowise";
        dify: "dify";
        crewai: "crewai";
        mcp: "mcp";
        custom: "custom";
    }>;
    reason: z.ZodString;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AssistantMessageStreamed">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"ConversationEnded">;
    conversationId: z.ZodString;
    reason: z.ZodOptional<z.ZodEnum<{
        resolved: "resolved";
        abandoned: "abandoned";
    }>>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"ButtonClicked">;
    conversationId: z.ZodString;
    buttonId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"LeadIdentified">;
    conversationId: z.ZodString;
    visitorId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"RateLimitExceeded">;
    scope: z.ZodEnum<{
        ip: "ip";
        tenant: "tenant";
        api_key: "api_key";
        visitor: "visitor";
        conversation: "conversation";
    }>;
}, z.core.$strip>, z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    type: z.ZodLiteral<"AdminConfigChanged">;
    actorUserId: z.ZodString;
    changedFields: z.ZodArray<z.ZodString>;
}, z.core.$strip>], "type">;
export type InternalEvent = z.infer<typeof internalEventSchema>;
//# sourceMappingURL=internal-events.d.ts.map