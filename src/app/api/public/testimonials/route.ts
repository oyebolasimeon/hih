import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Testimonial } from "@/models/Testimonial";

export async function GET() {
  await connectDB();

  const testimonials = await Testimonial.find({ published: true })
    .sort({ order: 1, createdAt: -1 })
    .select("name role quote photoUrl rating order")
    .lean();

  return NextResponse.json({
    testimonials: testimonials.map((t) => ({
      id: String(t._id),
      name: t.name,
      role: t.role,
      quote: t.quote,
      photoUrl: t.photoUrl || "",
      rating: t.rating,
      order: t.order,
    })),
  });
}
