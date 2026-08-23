import { describe, expect, it } from "vitest";
import { corsExtraOrigins, parseEnvironment } from "./index.js";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "access-secret-123",
  JWT_WIDGET_SECRET: "widget-secret-123",
  JWT_REFRESH_SECRET: "refresh-secret-123",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "faqchatbot-local",
  S3_ACCESS_KEY_ID: "minioadmin",
  S3_SECRET_ACCESS_KEY: "minioadmin"
};

describe("parseEnvironment", () => {
  it("parses a valid environment", () => {
    const environment = parseEnvironment(validEnvironment);

    expect(environment.API_PORT).toBe(3000);
  });

  it("rejects weak JWT secrets", () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        JWT_ACCESS_SECRET: "short"
      }),
    ).toThrow();
  });
});

describe("corsExtraOrigins", () => {
  it("splits and trims comma-separated origins", () => {
    const environment = parseEnvironment({
      ...validEnvironment,
      CORS_EXTRA_ORIGINS: " http://localhost:5173 , http://localhost:5174 ,"
    });

    expect(corsExtraOrigins(environment)).toEqual([
      "http://localhost:5173",
      "http://localhost:5174"
    ]);
  });

  it("returns an empty list when unset", () => {
    const environment = parseEnvironment(validEnvironment);

    expect(corsExtraOrigins(environment)).toEqual([]);
  });
});

