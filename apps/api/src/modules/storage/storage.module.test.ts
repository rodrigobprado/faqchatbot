import { S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import type { PlatformEnvironment } from "@faqchatbot/config";
import { buildS3ClientConfig } from "./storage.service.js";
import { StorageModule } from "./storage.module.js";

describe("StorageModule", () => {
  it("is defined and importable", () => {
    expect(StorageModule).toBeDefined();
  });

  it("builds a path-style s3 config for MinIO", () => {
    const env = {
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret"
    } as unknown as PlatformEnvironment;

    const config = buildS3ClientConfig(env);

    expect(config.endpoint).toBe("http://localhost:9000");
    expect(config.region).toBe("us-east-1");
    expect(config.forcePathStyle).toBe(true);
    expect(new S3Client(config)).toBeDefined();
  });
});
