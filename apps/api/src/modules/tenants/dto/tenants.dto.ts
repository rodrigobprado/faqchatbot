import type {
  CreateTenantDomainRequest,
  CreateTenantRequest,
  TenantAgentConfigRequest,
  TenantConfigRequest,
  UpdateTenantRequest
} from "@faqchatbot/contracts";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateTenantDto implements CreateTenantRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  publicId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsString()
  defaultLocale: string = "pt-BR";
}

export class UpdateTenantDto implements UpdateTenantRequest {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsIn(["active", "inactive", "suspended"])
  status?: "active" | "inactive" | "suspended";

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsString()
  defaultLocale?: string;
}

export class CreateTenantDomainDto implements CreateTenantDomainRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  domain!: string;
}

export class TenantConfigDto implements TenantConfigRequest {
  @IsOptional()
  @IsIn(["light", "dark", "auto"])
  theme: "light" | "dark" | "auto" = "auto";

  @IsOptional()
  @IsString()
  primaryColor: string = "#2563eb";

  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  initialMessage: string = "";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeholder: string = "";
}

export class TenantAgentConfigDto implements TenantAgentConfigRequest {
  @IsIn(["n8n", "openai_responses", "langgraph", "flowise", "dify", "crewai", "mcp", "custom"])
  provider!: TenantAgentConfigRequest["provider"];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  webhookSecretRef?: string;

  @IsOptional()
  @IsInt()
  timeoutMs: number = 15000;

  @IsOptional()
  @IsObject()
  retryPolicy: Record<string, unknown> = {};
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class RateLimitPolicyDto {
  @IsIn(["ip", "tenant", "api_key", "visitor", "conversation"])
  scope!: "ip" | "tenant" | "api_key" | "visitor" | "conversation";

  @IsInt()
  @IsPositive()
  limit!: number;

  @IsInt()
  @IsPositive()
  windowSeconds!: number;
}
