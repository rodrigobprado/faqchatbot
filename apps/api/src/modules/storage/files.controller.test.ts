import { describe, expect, it, vi } from "vitest";
import type { AccessTokenClaims } from "../auth/access-token-claims.js";
import type { AuthenticatedAdminRequest } from "./files.controller.js";
import { FilesController } from "./files.controller.js";
import type { StorageService } from "./storage.service.js";

const buildRequest = (): AuthenticatedAdminRequest =>
  ({
    user: {
      sub: "11111111-1111-1111-1111-111111111111",
      tenantId: "22222222-2222-2222-2222-222222222222",
      roles: [],
      permissions: ["tenants:write"],
      scope: "admin"
    } satisfies AccessTokenClaims
  }) as unknown as AuthenticatedAdminRequest;

const buildMultipartRequest = (
  part: { mimetype: string; fieldname: string; toBuffer: () => Promise<Buffer> } | undefined,
): AuthenticatedAdminRequest =>
  ({ ...buildRequest(), file: async () => part }) as unknown as AuthenticatedAdminRequest;

describe("FilesController", () => {
  it("uploads a multipart file within the policy", async () => {
    const upload = vi.fn().mockResolvedValue({ fileId: "f1", objectKey: "k" });
    const controller = new FilesController({ upload } as unknown as StorageService);
    const request = buildMultipartRequest({
      mimetype: "image/png",
      fieldname: "file",
      toBuffer: () => Promise.resolve(Buffer.from("png-bytes"))
    });

    const result = await controller.upload(request, "logo");

    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "22222222-2222-2222-2222-222222222222",
        mimeType: "image/png",
        sizeBytes: 9
      }),
    );
    expect(result).toEqual({ fileId: "f1", objectKey: "k" });
  });

  it("rejects uploads without a file field", async () => {
    const controller = new FilesController({} as unknown as StorageService);

    await expect(controller.upload(buildMultipartRequest(undefined))).rejects.toThrow(
      'Expected a multipart file field named "file"',
    );
  });

  it("rejects uploads with an unexpected field name", async () => {
    const controller = new FilesController({} as unknown as StorageService);

    await expect(
      controller.upload(
        buildMultipartRequest({
          mimetype: "image/png",
          fieldname: "attachment",
          toBuffer: () => Promise.resolve(Buffer.from("x"))
        }),
      ),
    ).rejects.toThrow();
  });

  it("rejects empty files before touching storage", async () => {
    const upload = vi.fn();
    const controller = new FilesController({ upload } as unknown as StorageService);

    await expect(
      controller.upload(
        buildMultipartRequest({
          mimetype: "image/png",
          fieldname: "file",
          toBuffer: () => Promise.resolve(Buffer.alloc(0))
        }),
      ),
    ).rejects.toThrow("File is empty");
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects oversized files before touching storage", async () => {
    const upload = vi.fn();
    const controller = new FilesController({ upload } as unknown as StorageService);
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024);

    await expect(
      controller.upload(
        buildMultipartRequest({
          mimetype: "application/pdf",
          fieldname: "file",
          toBuffer: () => Promise.resolve(bigBuffer)
        }),
      ),
    ).rejects.toThrow("File exceeds the maximum allowed size");
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects unknown purposes", async () => {
    const controller = new FilesController({} as unknown as StorageService);

    await expect(controller.upload(buildRequest(), "malware")).rejects.toThrow('Unknown purpose "malware"');
  });

  it("lists files scoped to the admin tenant", async () => {
    const list = vi.fn().mockResolvedValue([{ id: "f1" }]);
    const controller = new FilesController({ list } as unknown as StorageService);

    const result = await controller.list(buildRequest());

    expect(list).toHaveBeenCalledWith("22222222-2222-2222-2222-222222222222");
    expect(result).toEqual([{ id: "f1" }]);
  });

  it("returns a signed url for tenant-owned files", async () => {
    const createDownloadUrl = vi.fn().mockResolvedValue("https://signed.example.com/f1");
    const controller = new FilesController({ createDownloadUrl } as unknown as StorageService);

    const result = await controller.downloadUrl(buildRequest(), "f1");

    expect(createDownloadUrl).toHaveBeenCalledWith("f1", "22222222-2222-2222-2222-222222222222");
    expect(result).toEqual({ url: "https://signed.example.com/f1" });
  });
});
