import { randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { hashPassword, verifyPassword } from "../../auth/password.js";
import type { Database } from "../../db/client.js";
import { createApiKeysRepository } from "../../db/repositories/api-keys.repository.js";
import { DATABASE } from "../core/core.module.js";

export type CreatedApiKey = {
  id: string;
  name: string;
  rawKey: string;
};

const PREFIX_BYTES = 6;
const SECRET_BYTES = 24;

@Injectable()
export class ApiKeyService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(tenantId: string, name: string): Promise<CreatedApiKey> {
    const prefix = randomBytes(PREFIX_BYTES).toString("hex");
    const secret = randomBytes(SECRET_BYTES).toString("base64url");
    const hashedKey = await hashPassword(secret);

    const apiKeys = createApiKeysRepository(this.db);
    const created = await apiKeys.create({ tenantId, name, hashedKey, prefix, last4: secret.slice(-4) });

    return { id: created.id, name: created.name, rawKey: `${prefix}.${secret}` };
  }

  async verify(rawKey: string): Promise<boolean> {
    const [prefix, secret] = rawKey.split(".");

    if (!prefix || !secret) {
      return false;
    }

    const apiKeys = createApiKeysRepository(this.db);
    const record = await apiKeys.findActiveByPrefix(prefix);

    if (!record) {
      return false;
    }

    return verifyPassword(record.hashedKey, secret);
  }
}
