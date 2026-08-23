import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
  type S3ClientConfig
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { PlatformEnvironment } from "@faqchatbot/config";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Database } from "../../db/client.js";
import { createStoredFilesRepository } from "../../db/repositories/stored-files.repository.js";
import { DATABASE, ENV } from "../core/core.module.js";

export const S3_CLIENT = Symbol("S3_CLIENT");
export const S3_PRESIGNER = Symbol("S3_PRESIGNER");

export type S3ClientLike = Pick<S3Client, "send">;
export type PresignerLike = (
  client: unknown,
  command: GetObjectCommand,
  options: { expiresIn: number },
) => Promise<string>;

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf"
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_EXPIRY_SECONDS = 900;

export type UploadFileInput = {
  tenantId: string;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId?: string | null;
};

@Injectable()
export class StorageService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ENV) private readonly env: PlatformEnvironment,
    @Inject(S3_CLIENT) private readonly s3: S3ClientLike,
    @Inject(S3_PRESIGNER) private readonly presign: PresignerLike,
  ) {}

  assertUploadAllowed(mimeType: string, sizeBytes: number): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`MIME type "${mimeType}" is not allowed`);
    }
    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
      throw new BadRequestException("Invalid file size");
    }
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("File exceeds the maximum allowed size");
    }
  }

  async upload(input: UploadFileInput): Promise<{ fileId: string; objectKey: string }> {
    this.assertUploadAllowed(input.mimeType, input.sizeBytes);

    const objectKey = `${input.tenantId}/${randomUUID()}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: objectKey,
        Body: input.buffer,
        ContentType: input.mimeType
      }),
    );

    const file = await createStoredFilesRepository(this.db).create({
      tenantId: input.tenantId,
      bucket: this.env.S3_BUCKET,
      objectKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedByUserId: input.uploadedByUserId ?? null
    });

    return { fileId: file.id, objectKey };
  }

  async list(tenantId: string) {
    return createStoredFilesRepository(this.db).listByTenantId(tenantId);
  }

  async createDownloadUrl(fileId: string, tenantId: string): Promise<string> {
    const file = await createStoredFilesRepository(this.db).findByIdAndTenantId(fileId, tenantId);

    if (!file) {
      throw new NotFoundException("File not found");
    }

    const command = new GetObjectCommand({ Bucket: file.bucket, Key: file.objectKey });
    return this.presign(this.s3, command, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });
  }
}

export const buildS3ClientConfig = (env: PlatformEnvironment): S3ClientConfig => ({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
});

export const defaultPresigner: PresignerLike = (client, command, options) =>
  getSignedUrl(client as S3Client, command, options);
