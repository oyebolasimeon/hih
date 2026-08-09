import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { assertInvestor } from "@/lib/api-auth";
import { actorFromUser, writeAudit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function PATCH(request: Request) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  await connectDB();
  const doc = await User.findById(user.id);
  if (!doc) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    doc.passwordHash
  );
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json(
      { error: "New password must be different from your current password." },
      { status: 400 }
    );
  }

  doc.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await doc.save();

  await writeAudit({
    action: "user.password_change",
    summary: `Changed password for ${doc.email}`,
    actor: actorFromUser(user),
    entityType: "User",
    entityId: String(doc._id),
    investorId: user.id,
    investorVisible: true,
    changes: [
      {
        field: "password",
        oldValue: "[redacted]",
        newValue: "[changed]",
      },
    ],
    request,
  });

  return NextResponse.json({ success: true });
}
