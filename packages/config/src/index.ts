import { z } from "zod";

export const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_PUBLIC_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_WIDGET_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  CORS_EXTRA_ORIGINS: z.string().default("")
});

export type PlatformEnvironment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (input: NodeJS.ProcessEnv): PlatformEnvironment =>
  environmentSchema.parse(input);

export const corsExtraOrigins = (env: PlatformEnvironment): string[] =>
  env.CORS_EXTRA_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

