import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { assertCanMessage, sendPortalMessage } from "@/lib/portal-messages";
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

  await connectDB();

  // Existing threads: still require the other participant to be an allowlisted contact
  if (parsed.data.conversationId) {
    if (!mongoose.Types.ObjectId.isValid(parsed.data.conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation." },
        { status: 400 }
      );
    }
    const conversation = await Conversation.findOne({
      _id: parsed.data.conversationId,
      participantUserIds: user.id,
    }).lean();
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }
    const otherId = (conversation.participantUserIds as mongoose.Types.ObjectId[])
      .map(String)
      .find((id) => id !== user.id);
    if (!otherId || otherId !== parsed.data.toUserId) {
      return NextResponse.json(
        { error: "Recipient does not match this conversation." },
        { status: 403 }
      );
    }
  }

  const gate = await assertCanMessage(
    user.id,
    parsed.data.toUserId,
    parsed.data.listingId
  );
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (gate.contact.profileStatus === "suspended") {
    return NextResponse.json(
      { error: `Cannot message ${gate.contact.name} — their profile is suspended.` },
      { status: 403 }
    );
  }

  const result = await sendPortalMessage({
    fromUserId: user.id,
    toUserId: parsed.data.toUserId,
    listingId: parsed.data.listingId || gate.contact.listingId,
    body: parsed.data.body,
    conversationId: parsed.data.conversationId,
    alreadyVerified: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      conversation: result.conversation,
      message: result.message,
    },
    { status: 201 }
  );
}
