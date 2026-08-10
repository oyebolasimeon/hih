import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { notifyUser } from "@/lib/profile-context";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";

function serializeConversation(
  c: Record<string, unknown>,
  extras?: {
    otherUser?: { id: string; name: string; email: string } | null;
    listingTitle?: string | null;
    unreadCount?: number;
  }
) {
  return {
    id: String(c._id),
    participantUserIds: (c.participantUserIds as unknown[]).map(String),
    listingId: c.listingId ? String(c.listingId) : null,
    lastMessageAt: c.lastMessageAt || null,
    lastPreview: c.lastPreview || "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    otherUser: extras?.otherUser || null,
    listingTitle: extras?.listingTitle ?? null,
    unreadCount: extras?.unreadCount ?? 0,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const uid = new mongoose.Types.ObjectId(user.id);
  const rows = await Conversation.find({ participantUserIds: uid })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(50)
    .lean();

  const otherIds = rows
    .map((c) =>
      (c.participantUserIds as mongoose.Types.ObjectId[]).find(
        (id) => String(id) !== user.id
      )
    )
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const listingIds = rows
    .map((c) => c.listingId)
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const [users, listings, unreadAgg] = await Promise.all([
    User.find({ _id: { $in: otherIds } }).select("name email").lean(),
    Listing.find({ _id: { $in: listingIds } }).select("title").lean(),
    Message.aggregate([
      {
        $match: {
          toUserId: uid,
          read: false,
          conversationId: { $in: rows.map((r) => r._id) },
        },
      },
      { $group: { _id: "$conversationId", count: { $sum: 1 } } },
    ]),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));
  const unreadMap = new Map(
    unreadAgg.map((u: { _id: unknown; count: number }) => [
      String(u._id),
      u.count,
    ])
  );

  return NextResponse.json({
    conversations: rows.map((c) => {
      const otherId = (c.participantUserIds as mongoose.Types.ObjectId[]).find(
        (id) => String(id) !== user.id
      );
      const other = otherId ? userMap.get(String(otherId)) : null;
      const listing = c.listingId
        ? listingMap.get(String(c.listingId))
        : null;
      return serializeConversation(c as unknown as Record<string, unknown>, {
        otherUser: other
          ? {
              id: String(other._id),
              name: other.name || "User",
              email: other.email || "",
            }
          : null,
        listingTitle: listing?.title || null,
        unreadCount: unreadMap.get(String(c._id)) || 0,
      });
    }),
  });
}

const postSchema = z.object({
  toUserId: z.string().min(1),
  listingId: z.string().min(1).optional(),
  body: z.string().trim().min(1).max(4000),
  conversationId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid message." },
      { status: 400 }
    );
  }

  if (parsed.data.toUserId === user.id) {
    return NextResponse.json(
      { error: "You cannot message yourself." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.toUserId)) {
    return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });
  }
  if (
    parsed.data.listingId &&
    !mongoose.Types.ObjectId.isValid(parsed.data.listingId)
  ) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  await connectDB();
  const recipient = await User.findById(parsed.data.toUserId)
    .select("name email")
    .lean();
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  }

  let conversation = null as InstanceType<typeof Conversation> | null;

  if (parsed.data.conversationId) {
    if (!mongoose.Types.ObjectId.isValid(parsed.data.conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation." },
        { status: 400 }
      );
    }
    conversation = await Conversation.findOne({
      _id: parsed.data.conversationId,
      participantUserIds: user.id,
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }
  } else {
    const participants = [user.id, parsed.data.toUserId]
      .map((id) => new mongoose.Types.ObjectId(id))
      .sort((a, b) => String(a).localeCompare(String(b)));

    const filter: Record<string, unknown> = {
      participantUserIds: { $all: participants, $size: 2 },
    };
    if (parsed.data.listingId) {
      filter.listingId = parsed.data.listingId;
    } else {
      filter.listingId = { $exists: false };
    }

    conversation = await Conversation.findOne(filter);
    if (!conversation) {
      conversation = await Conversation.create({
        participantUserIds: participants,
        listingId: parsed.data.listingId || undefined,
        lastMessageAt: new Date(),
        lastPreview: parsed.data.body.slice(0, 280),
      });
    }
  }

  const preview = parsed.data.body.slice(0, 280);
  const message = await Message.create({
    conversationId: conversation!._id,
    fromUserId: user.id,
    toUserId: parsed.data.toUserId,
    listingId: conversation!.listingId || parsed.data.listingId || undefined,
    body: parsed.data.body,
    read: false,
  });

  conversation!.lastMessageAt = new Date();
  conversation!.lastPreview = preview;
  await conversation!.save();

  await notifyUser({
    userId: parsed.data.toUserId,
    type: "message.received",
    title: "New message",
    body: preview,
    link: "/portal/messages",
    meta: {
      conversationId: String(conversation!._id),
      messageId: String(message._id),
    },
    email: recipient.email
      ? { to: recipient.email, subject: "New message on House In Hand" }
      : undefined,
  });

  return NextResponse.json(
    {
      conversation: serializeConversation(
        conversation!.toObject() as unknown as Record<string, unknown>,
        {
          otherUser: {
            id: String(recipient._id),
            name: recipient.name || "User",
            email: recipient.email || "",
          },
        }
      ),
      message: {
        id: String(message._id),
        conversationId: String(message.conversationId),
        fromUserId: String(message.fromUserId),
        toUserId: String(message.toUserId),
        listingId: message.listingId ? String(message.listingId) : null,
        body: message.body,
        read: message.read,
        createdAt: message.createdAt,
      },
    },
    { status: 201 }
  );
}
