import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { assertInvestor } from "@/lib/api-auth";
import { actorFromUser, diffObjects, leanDoc, writeAudit } from "@/lib/audit";

export async function GET() {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  await connectDB();
  const doc = await User.findById(user.id).lean();
  if (!doc) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      phone: doc.phone || "",
      emailNotifications: doc.emailNotifications !== false,
      theme: doc.theme === "light" ? "light" : "dark",
    },
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[\d\s+().-]*$/, "Enter a valid phone number.")
    .optional(),
  emailNotifications: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid profile data." },
      { status: 400 }
    );
  }

  await connectDB();
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.emailNotifications !== undefined) {
    updates.emailNotifications = parsed.data.emailNotifications;
  }

  const before = await User.findById(user.id).lean();
  if (!before) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const doc = await User.findByIdAndUpdate(user.id, updates, { new: true }).lean();
  if (!doc) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await writeAudit({
    action: "user.update",
    summary: `Updated account profile for ${doc.email}`,
    actor: actorFromUser(user),
    entityType: "User",
    entityId: String(doc._id),
    investorId: user.id,
    investorVisible: true,
    changes: diffObjects(leanDoc(before), leanDoc(doc), [
      "name",
      "phone",
      "emailNotifications",
    ]),
    request,
  });

  return NextResponse.json({
    profile: {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      phone: doc.phone || "",
      emailNotifications: doc.emailNotifications !== false,
      theme: doc.theme === "light" ? "light" : "dark",
    },
  });
}
