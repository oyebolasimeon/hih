import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Allow import during build; connection throws when actually used without URI
  console.warn("MONGODB_URI is not set");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

export function isDbConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  return (
    name === "MongooseServerSelectionError" ||
    name === "MongoServerSelectionError" ||
    /Server selection timed out|ReplicaSetNoPrimary|Could not connect|whitelist|ECONNREFUSED|MONGODB_URI/i.test(
      msg
    )
  );
}

export function dbConnectionErrorMessage() {
  return "Database is temporarily unavailable. If you use MongoDB Atlas, ensure the cluster is running (not paused) and your current IP is allowed under Network Access, then try again.";
}

export async function connectDB() {
  if (cached.conn) {
    const state = cached.conn.connection.readyState;
    // 1 = connected, 2 = connecting
    if (state === 1) return cached.conn;
    if (state === 0 || state === 3) {
      cached.conn = null;
      cached.promise = null;
    }
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!cached.promise) {
    const serverSelectionTimeoutMS = Number(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 15_000
    );
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS,
        connectTimeoutMS: Number(
          process.env.MONGODB_CONNECT_TIMEOUT_MS || serverSelectionTimeoutMS
        ),
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
      })
      .then((conn) => conn)
      .catch((err) => {
        // Allow later retries after IP whitelist / network recovery
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
