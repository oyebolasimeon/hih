import mongoose, { Schema, models, model } from "mongoose";

export interface IAssistantConversation {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  language: string;
  lastMessageAt?: Date;
  lastPreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssistantConversationSchema = new Schema<IAssistantConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, trim: true, maxlength: 120, default: "New chat" },
    language: { type: String, trim: true, maxlength: 8, default: "en" },
    lastMessageAt: { type: Date },
    lastPreview: { type: String, trim: true, maxlength: 280 },
  },
  { timestamps: true }
);

AssistantConversationSchema.index({ userId: 1, lastMessageAt: -1 });

export const AssistantConversation =
  models.AssistantConversation ||
  model<IAssistantConversation>(
    "AssistantConversation",
    AssistantConversationSchema
  );
