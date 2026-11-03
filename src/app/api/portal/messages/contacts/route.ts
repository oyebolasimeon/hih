import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { listMessageContacts } from "@/lib/portal-messages";

export type { MessageContact } from "@/lib/portal-messages";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const contacts = await listMessageContacts(user.id);
  return NextResponse.json({ contacts });
}
