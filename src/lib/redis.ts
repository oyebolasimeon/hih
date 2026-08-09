import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis | undefined;
}

function parseHostPort() {
  const rawHost = (process.env.REDIS_HOST || "").trim();
  const envPort = process.env.REDIS_PORT
    ? Number(process.env.REDIS_PORT)
    : undefined;

  // Support REDIS_HOST="hostname:port" or just "hostname"
  if (rawHost.includes(":")) {
    const [host, portPart] = rawHost.split(":");
    return {
      host,
      port: envPort || Number(portPart) || 6379,
    };
  }

  return {
    host: rawHost || "127.0.0.1",
    port: envPort || 6379,
  };
}

function createRedis() {
  // Prefer discrete REDIS_* vars; fall back to REDIS_URL if present
  if (process.env.REDIS_URL && !process.env.REDIS_HOST) {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }

  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    throw new Error("Redis is not configured (set REDIS_HOST or REDIS_URL)");
  }

  const { host, port } = parseHostPort();
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USERNAME || undefined;
  const useTls =
    process.env.REDIS_TLS === "true" || process.env.REDIS_TLS === "1";

  return new Redis({
    host,
    port,
    username,
    password,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    ...(useTls ? { tls: {} } : {}),
  });
}

export function getRedis() {
  if (!global.redisClient) {
    global.redisClient = createRedis();
  }
  return global.redisClient;
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
) {
  await getRedis().set(key, value, "EX", ttlSeconds);
}

export async function redisGet(key: string) {
  return getRedis().get(key);
}

export async function redisDel(key: string) {
  await getRedis().del(key);
}

/** Returns true if under limit; increments counter with TTL. Fails open on Redis errors. */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
) {
  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  } catch {
    return true;
  }
}
