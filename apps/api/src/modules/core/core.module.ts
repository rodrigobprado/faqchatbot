import { parseEnvironment, type PlatformEnvironment } from "@faqchatbot/config";
import { Global, Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { createDatabase, type Database } from "../../db/client.js";

export const DATABASE = Symbol("DATABASE");
export const ENV = Symbol("ENV");
export const REDIS = Symbol("REDIS");

@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useFactory: (): PlatformEnvironment => parseEnvironment(process.env)
    },
    {
      provide: DATABASE,
      useFactory: (env: PlatformEnvironment): Database => createDatabase(env.DATABASE_URL).db,
      inject: [ENV]
    },
    {
      provide: REDIS,
      useFactory: (env: PlatformEnvironment): Redis => new Redis(env.REDIS_URL),
      inject: [ENV]
    }
  ],
  exports: [DATABASE, ENV, REDIS]
})
export class CoreModule {}
