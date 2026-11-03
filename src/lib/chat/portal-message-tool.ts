import type { ChatToolDefinition } from "@/lib/chat/openai-chat";
import { appUrl, APP_PATHS } from "@/lib/app-url";
import {
  findMessageContact,
  listMessageContacts,
  sendPortalMessage,
  type MessageContact,
} from "@/lib/portal-messages";

export const LIST_MESSAGE_CONTACTS_TOOL: ChatToolDefinition = {
  type: "function",
  function: {
    name: "list_message_contacts",
    description:
      "List landlords, tenants, and applicants the signed-in user is allowed to message. Only people linked by a property application or active/past lease appear. Each contact includes profile verification status — only verified profiles can receive messages.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Optional name/email/listing filter to narrow contacts",
        },
      },
    },
  },
};

export const SEND_MESSAGE_TO_CONTACT_TOOL: ChatToolDefinition = {
  type: "function",
  function: {
    name: "send_message_to_contact",
    description:
      "Send a portal Messages thread message to a landlord or tenant. ALWAYS call list_message_contacts first, verify the recipient’s profileVerified is true, show the user a draft, and only call this with confirmed=true after the user explicitly approves the recipient and wording. Never invent recipient ids.",
    parameters: {
      type: "object",
      properties: {
        recipientName: {
          type: "string",
          description: "Display name or email of the contact (preferred)",
        },
        recipientUserId: {
          type: "string",
          description:
            "Exact userId from list_message_contacts when name is ambiguous",
        },
        listingId: {
          type: "string",
          description:
            "Listing id from the contact row when the same person appears on multiple properties",
        },
        message: {
          type: "string",
          description: "Message body to send (1–4000 characters)",
        },
        confirmed: {
          type: "boolean",
          description:
            "Must be true only after the user explicitly confirmed sending this exact draft to this person",
        },
      },
      required: ["message", "confirmed"],
    },
  },
};

export const PORTAL_ASSISTANT_TOOLS: ChatToolDefinition[] = [
  LIST_MESSAGE_CONTACTS_TOOL,
  SEND_MESSAGE_TO_CONTACT_TOOL,
];

function summarizeContact(c: MessageContact) {
  return {
    userId: c.userId,
    name: c.name,
    email: c.email,
    listingId: c.listingId,
    listingTitle: c.listingTitle,
    relationship: c.context,
    profileType: c.profileType,
    profileStatus: c.profileStatus,
    profileVerified: c.profileVerified,
    canMessage: c.profileVerified,
  };
}

async function listContactsForAi(userId: string, query?: string) {
  const contacts = await listMessageContacts(userId);
  const q = (query || "").trim().toLowerCase();
  const filtered = q
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.listingTitle || "").toLowerCase().includes(q) ||
          c.context.toLowerCase().includes(q)
      )
    : contacts;

  return {
    ok: true,
    count: filtered.length,
    contacts: filtered.map(summarizeContact),
    note:
      filtered.length === 0
        ? "No messaging contacts yet. The user needs an application or lease link before messaging landlords/tenants."
        : "Only contacts with profileVerified=true can receive messages. Show the user names and ask them to confirm before sending.",
  };
}

async function sendMessageForAi(
  userId: string,
  args: {
    recipientName?: string;
    recipientUserId?: string;
    listingId?: string;
    message?: string;
    confirmed?: boolean;
  }
) {
  const message = (args.message || "").trim();
  if (!message) {
    return { ok: false, error: "Message body is required." };
  }
  if (message.length > 4000) {
    return { ok: false, error: "Message is too long (max 4000 characters)." };
  }

  const contacts = await listMessageContacts(userId);
  const found = findMessageContact(contacts, {
    recipientName: args.recipientName,
    recipientUserId: args.recipientUserId,
    listingId: args.listingId,
  });

  if (!found.ok) {
    return {
      ok: false,
      error: found.error,
      matches: found.matches?.map(summarizeContact),
    };
  }

  const contact = found.contact;
  if (contact.profileStatus === "suspended") {
    return {
      ok: false,
      error: `Blocked: ${contact.name}'s profile is suspended. Cannot send.`,
      contact: summarizeContact(contact),
    };
  }
  if (!contact.profileVerified) {
    return {
      ok: false,
      error: `Blocked: ${contact.name}'s ${contact.profileType || "user"} profile is “${contact.profileStatus || "unknown"}” — not verified. Tell the user messaging via AI requires a verified profile. They can open ${appUrl(APP_PATHS.portalMessages)} manually if needed, or wait until verification completes.`,
      contact: summarizeContact(contact),
    };
  }

  if (!args.confirmed) {
    return {
      ok: false,
      needsConfirmation: true,
      draft: {
        toName: contact.name,
        toEmail: contact.email,
        toUserId: contact.userId,
        listingId: contact.listingId,
        listingTitle: contact.listingTitle,
        relationship: contact.context,
        profileType: contact.profileType,
        profileStatus: contact.profileStatus,
        profileVerified: true,
        message,
      },
      instruction:
        "Show this draft (name, property, message) to the user. If they explicitly confirm, call send_message_to_contact again with the same fields and confirmed=true.",
    };
  }

  const result = await sendPortalMessage({
    fromUserId: userId,
    toUserId: contact.userId,
    listingId: contact.listingId,
    body: message,
    alreadyVerified: true,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      contact: result.contact ? summarizeContact(result.contact) : undefined,
    };
  }

  return {
    ok: true,
    sent: true,
    toName: contact.name,
    listingTitle: contact.listingTitle,
    conversationId: result.message.conversationId,
    messageId: result.message.id,
    portalLink: appUrl(
      APP_PATHS.messagesThread(result.message.conversationId)
    ),
    preview: result.message.body.slice(0, 280),
  };
}

export async function runPortalAssistantTool(
  userId: string,
  name: string,
  argsJson: string
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
  } catch {
    return JSON.stringify({ ok: false, error: "Invalid tool arguments JSON." });
  }

  if (name === "list_message_contacts") {
    const result = await listContactsForAi(
      userId,
      typeof args.query === "string" ? args.query : undefined
    );
    return JSON.stringify(result);
  }

  if (name === "send_message_to_contact") {
    const result = await sendMessageForAi(userId, {
      recipientName:
        typeof args.recipientName === "string" ? args.recipientName : undefined,
      recipientUserId:
        typeof args.recipientUserId === "string"
          ? args.recipientUserId
          : undefined,
      listingId:
        typeof args.listingId === "string" ? args.listingId : undefined,
      message: typeof args.message === "string" ? args.message : undefined,
      confirmed: args.confirmed === true,
    });
    return JSON.stringify(result);
  }

  return JSON.stringify({ error: "Tool not allowed for portal assistant." });
}
