import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { FaqItem } from "@/models/FaqItem";

export async function GET() {
  await connectDB();

  const faqs = await FaqItem.find({ published: true })
    .sort({ order: 1, createdAt: -1 })
    .select("question answer category order")
    .lean();

  return NextResponse.json({
    faqs: faqs.map((f) => ({
      id: String(f._id),
      question: f.question,
      answer: f.answer,
      category: f.category || "",
      order: f.order,
    })),
  });
}
