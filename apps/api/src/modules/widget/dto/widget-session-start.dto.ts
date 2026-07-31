import type { PageContext, WidgetSessionStartRequest } from "@faqchatbot/contracts";
import { Type } from "class-transformer";
import {
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

class ViewportDto {
  @IsInt()
  @IsPositive()
  width!: number;

  @IsInt()
  @IsPositive()
  height!: number;
}

class PageContextDto implements PageContext {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(35)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  referrer?: string;

  @IsOptional()
  @IsObject()
  utm: Record<string, string> = {};

  @ValidateNested()
  @Type(() => ViewportDto)
  viewport!: ViewportDto;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  currentPage?: string;

  @IsISO8601()
  timestamp!: string;
}

export class WidgetSessionStartDto implements WidgetSessionStartRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  agentId!: string;

  @IsOptional()
  @IsUUID()
  visitorId?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ValidateNested()
  @Type(() => PageContextDto)
  context!: PageContext;
}
