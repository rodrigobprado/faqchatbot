import { sql } from "drizzle-orm";
import { Injectable } from "@nestjs/common";
import type { OnModuleDestroy } from "@nestjs/common";
import { createDatabase } from "./client.js";
import type { Database } from "./client.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Database;
  private readonly client;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required to initialize the database");
    }

    const { db, client } = createDatabase(databaseUrl);
    this.db = db;
    this.client = client;
  }

  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end();
  }
}
