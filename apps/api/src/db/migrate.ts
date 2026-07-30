import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const { db, client } = createDatabase(databaseUrl);
await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();
