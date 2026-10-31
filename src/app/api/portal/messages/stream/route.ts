import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";
import {
  channelForUser,
  createMessageSubscriber,
  type LiveMessageEvent,
} from "@/lib/realtime/message-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(data: unknown, event = "message") {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId") || "";
  const sinceParam = url.searchParams.get("since") || "";
  let since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);
  if (Number.isNaN(since.getTime())) since = new Date(Date.now() - 60_000);

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;
  let sub: ReturnType<typeof createMessageSubscriber> = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      send(sse({ ok: true, at: new Date().toISOString() }, "ready"));

      const emitMessage = (event: LiveMessageEvent) => {
        if (
          conversationId &&
          event.conversationId !== conversationId
        ) {
          return;
        }
        send(sse(event));
        if (event.message?.createdAt) {
          const t = new Date(event.message.createdAt);
          if (t > since) since = t;
        }
      };

      sub = createMessageSubscriber();
      if (sub) {
        const channel = channelForUser(user.id);
        try {
          await sub.subscribe(channel);
          sub.on("message", (_ch, raw) => {
            try {
              const parsed = JSON.parse(raw) as LiveMessageEvent;
              emitMessage(parsed);
            } catch {
              /* ignore bad payloads */
            }
          });
        } catch (err) {
          console.warn("SSE redis subscribe failed, using poll:", err);
          try {
            await sub.quit();
          } catch {
            /* */
          }
          sub = null;
        }
      }

      const pollOnce = async () => {
        try {
          await connectDB();
          const filter: Record<string, unknown> = {
            toUserId: user.id,
            createdAt: { $gt: since },
          };
          if (
            conversationId &&
            mongoose.Types.ObjectId.isValid(conversationId)
          ) {
            filter.conversationId = conversationId;
          }
          const rows = await Message.find(filter)
            .sort({ createdAt: 1 })
            .limit(50)
            .lean();
          for (const m of rows) {
            const createdAt = (m.createdAt as Date).toISOString();
            emitMessage({
              type: "message",
              conversationId: String(m.conversationId),
              message: {
                id: String(m._id),
                conversationId: String(m.conversationId),
                fromUserId: String(m.fromUserId),
                toUserId: String(m.toUserId),
                listingId: m.listingId ? String(m.listingId) : null,
                body: m.body,
                read: Boolean(m.read),
                createdAt,
              },
              preview: m.body.slice(0, 280),
            });
            since = new Date(m.createdAt as Date);
          }
        } catch (err) {
          console.warn("SSE poll failed:", err);
        }
      };

      // Always poll as a safety net (covers missed pub/sub + multi-instance lag)
      void pollOnce();
      poll = setInterval(() => void pollOnce(), sub ? 8000 : 2500);

      heartbeat = setInterval(() => {
        send(sse({ t: Date.now() }, "ping"));
      }, 20000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (poll) clearInterval(poll);
        if (sub) {
          void sub.quit().catch(() => undefined);
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (poll) clearInterval(poll);
      if (sub) void sub.quit().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
