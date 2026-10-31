import type Redis from "ioredis";
import { getRedis } from "@/lib/redis";
import type { LiveMessageEvent } from "@/lib/realtime/types";

export type { LiveMessageEvent };

function channelForUser(userId: string) {
  return `hih:msg:${userId}`;
}

export async function publishMessageEvent(
  userId: string,
  event: LiveMessageEvent
): Promise<boolean> {
  try {
    await getRedis().publish(channelForUser(userId), JSON.stringify(event));
    return true;
  } catch (err) {
    console.warn("message bus publish failed:", err);
    return false;
  }
}

/** Subscriber connection (separate from the command client). */
export function createMessageSubscriber(): Redis | null {
  try {
    return getRedis().duplicate();
  } catch {
    return null;
  }
}

export { channelForUser };
