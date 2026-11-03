import mongoose from "mongoose";
import { notifyUser } from "@/lib/profile-context";
import { publishMessageEvent } from "@/lib/realtime/message-bus";
import { sendWebPushToUser } from "@/lib/push";
import { Application } from "@/models/Application";
import { Conversation } from "@/models/Conversation";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Message } from "@/models/Message";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

export type MessageContact = {
  userId: string;
  name: string;
  email: string;
  listingId: string | null;
  listingTitle: string | null;
  context: string;
  /** Best-effort profile status for the other party */
  profileStatus: string | null;
  profileType: string | null;
  profileVerified: boolean;
};

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

export async function listMessageContacts(
  userId: string
): Promise<MessageContact[]> {
  const myProfiles = await Profile.find({ userId }).select("_id").lean();
  const myProfileIds = myProfiles.map((p) => p._id);
  const myProfileIdSet = new Set(myProfileIds.map(String));

  const [applications, leases] = await Promise.all([
    Application.find({
      $or: [
        { applicantUserId: userId },
        { landlordProfileId: { $in: myProfileIds } },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(80)
      .lean(),
    Lease.find({
      $or: [
        { tenantProfileId: { $in: myProfileIds } },
        { landlordProfileId: { $in: myProfileIds } },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean(),
  ]);

  const listingIds = [
    ...new Set([
      ...applications.map((a) => String(a.listingId)),
      ...leases.map((l) => String(l.listingId)),
    ]),
  ];

  const tenantProfileIds = [
    ...new Set(
      leases
        .filter((l) => myProfileIdSet.has(String(l.landlordProfileId)))
        .map((l) => String(l.tenantProfileId))
    ),
  ];

  const [listings, tenantProfiles] = await Promise.all([
    Listing.find({ _id: { $in: listingIds } })
      .select("title ownerUserId")
      .lean(),
    tenantProfileIds.length
      ? Profile.find({ _id: { $in: tenantProfileIds } })
          .select("userId")
          .lean()
      : Promise.resolve([]),
  ]);

  const listingMap = new Map(listings.map((l) => [String(l._id), l]));
  const tenantUserByProfile = new Map(
    tenantProfiles.map((p) => [String(p._id), String(p.userId)])
  );

  type Candidate = {
    userId: string;
    listingId: string | null;
    listingTitle: string | null;
    context: string;
  };

  const candidates: Candidate[] = [];

  for (const app of applications) {
    const listing = listingMap.get(String(app.listingId));
    const listingTitle = listing?.title || null;
    const listingId = String(app.listingId);

    if (String(app.applicantUserId) === userId) {
      const ownerId = listing ? String(listing.ownerUserId) : null;
      if (ownerId && ownerId !== userId) {
        candidates.push({
          userId: ownerId,
          listingId,
          listingTitle,
          context: "Application",
        });
      }
    } else {
      const applicantId = String(app.applicantUserId);
      if (applicantId !== userId) {
        candidates.push({
          userId: applicantId,
          listingId,
          listingTitle,
          context: "Applicant",
        });
      }
    }
  }

  for (const lease of leases) {
    const listing = listingMap.get(String(lease.listingId));
    const listingTitle = listing?.title || null;
    const listingId = String(lease.listingId);
    const isLandlord = myProfileIdSet.has(String(lease.landlordProfileId));

    if (isLandlord) {
      const tenantUserId = tenantUserByProfile.get(String(lease.tenantProfileId));
      if (tenantUserId && tenantUserId !== userId) {
        candidates.push({
          userId: tenantUserId,
          listingId,
          listingTitle,
          context: "Lease",
        });
      }
    } else if (listing) {
      const ownerId = String(listing.ownerUserId);
      if (ownerId !== userId) {
        candidates.push({
          userId: ownerId,
          listingId,
          listingTitle,
          context: "Lease",
        });
      }
    }
  }

  const seen = new Set<string>();
  const unique: Candidate[] = [];
  for (const c of candidates) {
    const key = `${c.userId}:${c.listingId || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }

  const userIds = [...new Set(unique.map((c) => c.userId))];
  const [users, otherProfiles] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("name email").lean(),
    userIds.length
      ? Profile.find({ userId: { $in: userIds } })
          .select("userId type status")
          .lean()
      : Promise.resolve([]),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const profilesByUser = new Map<
    string,
    { type: string; status: string }[]
  >();
  for (const p of otherProfiles) {
    const key = String(p.userId);
    const list = profilesByUser.get(key) || [];
    list.push({ type: p.type, status: p.status });
    profilesByUser.set(key, list);
  }

  function pickProfile(
    uid: string,
    context: string
  ): { type: string; status: string } | null {
    const list = profilesByUser.get(uid) || [];
    if (!list.length) return null;
    const prefer =
      context === "Applicant" || context === "Lease"
        ? ["tenant", "student", "landlord", "estate_manager"]
        : ["landlord", "estate_manager", "tenant", "student"];
    for (const type of prefer) {
      const hit = list.find((p) => p.type === type);
      if (hit) return hit;
    }
    return list[0];
  }

  return unique
    .map((c) => {
      const u = userMap.get(c.userId);
      if (!u) return null;
      const profile = pickProfile(c.userId, c.context);
      return {
        userId: c.userId,
        name: u.name || "User",
        email: u.email || "",
        listingId: c.listingId,
        listingTitle: c.listingTitle,
        context: c.context,
        profileStatus: profile?.status || null,
        profileType: profile?.type || null,
        profileVerified: profile?.status === "verified",
      } satisfies MessageContact;
    })
    .filter(Boolean) as MessageContact[];
}

export function findMessageContact(
  contacts: MessageContact[],
  opts: {
    recipientUserId?: string | null;
    recipientName?: string | null;
    listingId?: string | null;
  }
):
  | { ok: true; contact: MessageContact }
  | { ok: false; error: string; matches?: MessageContact[] } {
  let pool = contacts;

  if (opts.listingId) {
    pool = pool.filter((c) => c.listingId === opts.listingId);
  }

  if (opts.recipientUserId) {
    const hits = pool.filter((c) => c.userId === opts.recipientUserId);
    if (hits.length === 1) return { ok: true, contact: hits[0] };
    if (hits.length > 1) {
      return {
        ok: false,
        error:
          "Multiple contacts match that user. Specify listingId to disambiguate.",
        matches: hits,
      };
    }
    return {
      ok: false,
      error:
        "That person is not in your messaging contacts. You can only message landlords/tenants linked by application or lease.",
    };
  }

  const name = (opts.recipientName || "").trim().toLowerCase();
  if (!name) {
    return {
      ok: false,
      error: "Provide recipientName or recipientUserId from list_message_contacts.",
    };
  }

  const exact = pool.filter(
    (c) =>
      c.name.toLowerCase() === name ||
      c.email.toLowerCase() === name ||
      c.name.toLowerCase().includes(name) ||
      (name.length >= 3 && c.email.toLowerCase().includes(name))
  );

  // Prefer stronger matches
  const ranked = exact.sort((a, b) => {
    const score = (c: MessageContact) => {
      if (c.name.toLowerCase() === name || c.email.toLowerCase() === name)
        return 0;
      if (c.name.toLowerCase().startsWith(name)) return 1;
      return 2;
    };
    return score(a) - score(b);
  });

  if (ranked.length === 0) {
    return {
      ok: false,
      error: `No verified messaging contact matched “${opts.recipientName}”. Call list_message_contacts and pick someone linked by application or lease.`,
    };
  }

  // Unique by userId+listing
  if (ranked.length === 1) return { ok: true, contact: ranked[0] };

  const samePerson = ranked.every((c) => c.userId === ranked[0].userId);
  if (samePerson && !opts.listingId) {
    // Same person, multiple listings — pick first lease context if any
    const lease = ranked.find((c) => c.context === "Lease");
    return { ok: true, contact: lease || ranked[0] };
  }

  return {
    ok: false,
    error:
      "Multiple people match that name. Ask the user which one, then pass recipientUserId and listingId.",
    matches: ranked.slice(0, 6),
  };
}

export async function assertCanMessage(
  fromUserId: string,
  toUserId: string,
  listingId?: string | null
): Promise<
  | { ok: true; contact: MessageContact }
  | { ok: false; error: string; status: number }
> {
  if (toUserId === fromUserId) {
    return { ok: false, error: "You cannot message yourself.", status: 400 };
  }
  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    return { ok: false, error: "Invalid recipient.", status: 400 };
  }
  if (listingId && !mongoose.Types.ObjectId.isValid(listingId)) {
    return { ok: false, error: "Invalid listing.", status: 400 };
  }

  const contacts = await listMessageContacts(fromUserId);
  const found = findMessageContact(contacts, {
    recipientUserId: toUserId,
    listingId: listingId || null,
  });
  if (!found.ok) {
    return { ok: false, error: found.error, status: 403 };
  }
  return { ok: true, contact: found.contact };
}

export async function sendPortalMessage(opts: {
  fromUserId: string;
  toUserId: string;
  body: string;
  listingId?: string | null;
  conversationId?: string | null;
  /** When true, skip allowlist (only for internal use after assertCanMessage) */
  alreadyVerified?: boolean;
}) {
  const body = opts.body.trim();
  if (!body || body.length > 4000) {
    return {
      ok: false as const,
      error: "Message body must be 1–4000 characters.",
      status: 400,
    };
  }

  let contact: MessageContact | null = null;
  if (!opts.alreadyVerified) {
    const gate = await assertCanMessage(
      opts.fromUserId,
      opts.toUserId,
      opts.listingId
    );
    if (!gate.ok) {
      return { ok: false as const, error: gate.error, status: gate.status };
    }
    contact = gate.contact;
  } else {
    const contacts = await listMessageContacts(opts.fromUserId);
    const found = findMessageContact(contacts, {
      recipientUserId: opts.toUserId,
      listingId: opts.listingId || null,
    });
    if (found.ok) contact = found.contact;
  }

  if (contact?.profileStatus === "suspended") {
    return {
      ok: false as const,
      error: `Cannot message ${contact.name} — their profile is suspended.`,
      status: 403,
      contact,
    };
  }

  const recipient = await User.findById(opts.toUserId).select("name email").lean();
  if (!recipient) {
    return { ok: false as const, error: "Recipient not found.", status: 404 };
  }

  let conversation = null as InstanceType<typeof Conversation> | null;
  const listingId = opts.listingId || contact?.listingId || null;

  if (opts.conversationId) {
    if (!mongoose.Types.ObjectId.isValid(opts.conversationId)) {
      return { ok: false as const, error: "Invalid conversation.", status: 400 };
    }
    conversation = await Conversation.findOne({
      _id: opts.conversationId,
      participantUserIds: opts.fromUserId,
    });
    if (!conversation) {
      return {
        ok: false as const,
        error: "Conversation not found.",
        status: 404,
      };
    }
    const participants = (conversation.participantUserIds || []).map(String);
    if (!participants.includes(opts.toUserId)) {
      return {
        ok: false as const,
        error: "Recipient is not part of that conversation.",
        status: 403,
      };
    }
  } else {
    const participants = [opts.fromUserId, opts.toUserId]
      .map((id) => new mongoose.Types.ObjectId(id))
      .sort((a, b) => String(a).localeCompare(String(b)));

    const filter: Record<string, unknown> = {
      participantUserIds: { $all: participants, $size: 2 },
    };
    if (listingId) {
      filter.listingId = listingId;
    } else {
      filter.listingId = { $exists: false };
    }

    conversation = await Conversation.findOne(filter);
    if (!conversation) {
      conversation = await Conversation.create({
        participantUserIds: participants,
        listingId: listingId || undefined,
        lastMessageAt: new Date(),
        lastPreview: body.slice(0, 280),
      });
    }
  }

  const preview = body.slice(0, 280);
  const message = await Message.create({
    conversationId: conversation!._id,
    fromUserId: opts.fromUserId,
    toUserId: opts.toUserId,
    listingId: conversation!.listingId || listingId || undefined,
    body,
    read: false,
  });

  conversation!.lastMessageAt = new Date();
  conversation!.lastPreview = preview;
  await conversation!.save();

  const liveMessage = {
    id: String(message._id),
    conversationId: String(message.conversationId),
    fromUserId: String(message.fromUserId),
    toUserId: String(message.toUserId),
    listingId: message.listingId ? String(message.listingId) : null,
    body: message.body,
    read: message.read,
    createdAt: (message.createdAt as Date).toISOString(),
  };

  const liveEvent = {
    type: "message" as const,
    conversationId: liveMessage.conversationId,
    message: liveMessage,
    preview,
  };

  await Promise.all([
    publishMessageEvent(opts.toUserId, liveEvent),
    publishMessageEvent(opts.fromUserId, liveEvent),
    notifyUser({
      userId: opts.toUserId,
      type: "message.received",
      title: "New message",
      body: preview,
      link: `/portal/messages?c=${liveMessage.conversationId}`,
      meta: {
        conversationId: liveMessage.conversationId,
        messageId: liveMessage.id,
      },
      email: recipient.email
        ? { to: recipient.email, subject: "New message on House In Hands" }
        : undefined,
    }),
    sendWebPushToUser({
      userId: opts.toUserId,
      title: "New message",
      body: preview,
      link: `/portal/messages?c=${liveMessage.conversationId}`,
      tag: `msg-${liveMessage.conversationId}`,
    }),
  ]);

  return {
    ok: true as const,
    conversation: serializeConversation(
      conversation!.toObject() as unknown as Record<string, unknown>,
      {
        otherUser: {
          id: String(recipient._id),
          name: recipient.name || "User",
          email: recipient.email || "",
        },
        listingTitle: contact?.listingTitle || null,
      }
    ),
    message: liveMessage,
    contact,
  };
}
