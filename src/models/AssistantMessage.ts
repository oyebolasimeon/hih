import mongoose, { Schema, models, model } from "mongoose";

export interface IAssistantMessage {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssistantMessageSchema = new Schema<IAssistantMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "AssistantConversation",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 8000 },
  },
  { timestamps: true }
);

AssistantMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const AssistantMessage =
  models.AssistantMessage ||
  model<IAssistantMessage>("AssistantMessage", AssistantMessageSchema);
