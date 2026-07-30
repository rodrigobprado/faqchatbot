import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export const createDatabase = (databaseUrl: string): { db: Database; client: Sql } => {
  const client = postgres(databaseUrl);
  return { db: drizzle(client, { schema }), client };
};
