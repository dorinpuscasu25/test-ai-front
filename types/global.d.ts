import {PrismaClient} from "@prisma/client";

export interface CachedMongoClient {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var mongoose: Cached | undefined;
}
export {};
