import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformEnvironment } from "@faqchatbot/config";
import type { Database } from "../../db/client.js";
import { StorageService, type PresignerLike, type S3ClientLike } from "./storage.service.js";

vi.mock("../../db/repositories/stored-files.repository.js", () => ({
  createStoredFilesRepository: vi.fn().mockReturnValue({
    create: vi.fn().mockResolvedValue({ id: "file-1", objectKey: "tenant-1/abc" }),
    findByIdAndTenantId: vi.fn(),
    listByTenantId: vi.fn().mockResolvedValue([{ id: "file-1" }])
  })
}));

import { createStoredFilesRepository } from "../../db/repositories/stored-files.repository.js";

const env = {
  S3_BUCKET: "faqchatbot-local",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY_ID: "minioadmin",
  S3_SECRET_ACCESS_KEY: "minioadmin"
} as unknown as PlatformEnvironment;

const buildService = (overrides: { send?: S3ClientLike["send"]; presign?: PresignerLike } = {}) => {
  const repository = createStoredFilesRepository({} as Database);
  const s3: S3ClientLike = { send: overrides.send ?? vi.fn().mockResolvedValue({}) };
  const presign: PresignerLike =
    overrides.presign ?? vi.fn().mockResolvedValue("https://signed.example.com/file");

  return {
    service: new StorageService({} as Database, env, s3, presign),
    repository,
    s3,
    presign
  };
};

describe("StorageService", () => {
  beforeEach(() => {
    vi.mocked(createStoredFilesRepository).mockClear();
  });

  it("rejects mime types outside the whitelist", () => {
    const { service } = buildService();

    expect(() => service.assertUploadAllowed("application/x-msdownload", 10)).toThrow(BadRequestException);
    expect(() => service.assertUploadAllowed("image/svg+xml", 10)).toThrow(BadRequestException);
    expect(() => service.assertUploadAllowed("application/javascript", 10)).toThrow(BadRequestException);
  });

  it("accepts whitelisted mime types", () => {
    const { service } = buildService();

    expect(() => service.assertUploadAllowed("image/png", 10)).not.toThrow();
    expect(() => service.assertUploadAllowed("application/pdf", 10)).not.toThrow();
  });

  it("rejects invalid sizes", () => {
    const { service } = buildService();

    expect(() => service.assertUploadAllowed("image/png", 0)).toThrow(BadRequestException);
    expect(() => service.assertUploadAllowed("image/png", -5)).toThrow(BadRequestException);
    expect(() => service.assertUploadAllowed("image/png", 6 * 1024 * 1024)).toThrow(
      BadRequestException,
    );
  });

  it("uploads to the tenant-scoped key and records the file", async () => {
    const { service, s3, repository } = buildService();
    const createMock = repository.create as ReturnType<typeof vi.fn>;

    const result = await service.upload({
      tenantId: "tenant-1",
      buffer: Buffer.from("bytes"),
      mimeType: "image/png",
      sizeBytes: 5
    });

    expect(s3.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    const command = vi.mocked(s3.send).mock.calls[0]?.[0] as PutObjectCommand;
    expect(command.input.Bucket).toBe("faqchatbot-local");
    expect(command.input.Key?.startsWith("tenant-1/")).toBe(true);

    expect(result.fileId).toBe("file-1");
    expect(result.objectKey.startsWith("tenant-1/")).toBe(true);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        bucket: "faqchatbot-local",
        mimeType: "image/png"
      }),
    );
  });

  it("lists files for a tenant", async () => {
    const { service } = buildService();

    const listed = await service.list("tenant-1");

    expect(listed).toEqual([{ id: "file-1" }]);
  });

  it("returns a signed download url for tenant-owned files", async () => {
    const { service, repository, s3, presign } = buildService();
    const findByIdAndTenantId = repository.findByIdAndTenantId as ReturnType<typeof vi.fn>;
    findByIdAndTenantId.mockResolvedValue({
      id: "file-1",
      bucket: "faqchatbot-local",
      objectKey: "tenant-1/abc",
      mimeType: "image/png",
      sizeBytes: 5,
      tenantId: "tenant-1",
      uploadedByUserId: null,
      createdAt: new Date()
    });

    const url = await service.createDownloadUrl("file-1", "tenant-1");

    expect(findByIdAndTenantId).toHaveBeenCalledWith("file-1", "tenant-1");
    expect(presign).toHaveBeenCalledWith(s3, expect.any(GetObjectCommand), { expiresIn: 900 });
    expect(url).toBe("https://signed.example.com/file");
  });

  it("fails when the file belongs to another tenant", async () => {
    const { service, repository } = buildService();
    const findByIdAndTenantId = repository.findByIdAndTenantId as ReturnType<typeof vi.fn>;
    findByIdAndTenantId.mockResolvedValue(null);

    await expect(service.createDownloadUrl("file-1", "tenant-other")).rejects.toThrow(NotFoundException);
  });
});
