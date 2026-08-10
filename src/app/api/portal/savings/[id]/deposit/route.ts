import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { notifyUser } from "@/lib/profile-context";
import { SavingsGoal } from "@/models/SavingsGoal";
import { User } from "@/models/User";

type Ctx = { params: Promise<{ id: string }> };

const depositSchema = z.object({
  amount: z.number().positive().max(10_000_000),
});

export async function POST(req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid goal." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid deposit." },
      { status: 400 }
    );
  }

  await connectDB();
  const goal = await SavingsGoal.findOne({ _id: id, userId: user.id });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
  if (goal.status === "paused") {
    return NextResponse.json(
      { error: "This goal is paused." },
      { status: 409 }
    );
  }

  goal.savedAmount = Math.min(
    goal.targetAmount,
    goal.savedAmount + parsed.data.amount
  );
  if (goal.savedAmount >= goal.targetAmount) {
    goal.status = "completed";
  }
  await goal.save();

  if (goal.status === "completed") {
    const dbUser = await User.findById(user.id).select("email").lean();
    await notifyUser({
      userId: user.id,
      type: "savings.completed",
      title: "Savings goal reached",
      body: `You’ve reached your goal “${goal.title}” (NGN ${goal.targetAmount.toLocaleString()}).`,
      link: "/portal/savings",
      meta: { goalId: String(goal._id) },
      email: dbUser?.email
        ? { to: dbUser.email, subject: "Savings goal completed" }
        : undefined,
    });
  }

  return NextResponse.json({
    goal: {
      id: String(goal._id),
      title: goal.title,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      currency: goal.currency,
      cadence: goal.cadence,
      status: goal.status,
    },
  });
}
