import mongoose, { Schema, models, model } from "mongoose";

export interface IConversation {
  _id: mongoose.Types.ObjectId;
  participantUserIds: mongoose.Types.ObjectId[];
  listingId?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  lastPreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participantUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) =>
          Array.isArray(v) && v.length === 2,
        message: "Conversation requires exactly two participants.",
      },
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      index: true,
    },
    lastMessageAt: { type: Date },
    lastPreview: { type: String, trim: true, maxlength: 280 },
  },
  { timestamps: true }
);

ConversationSchema.index({ participantUserIds: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation =
  models.Conversation ||
  model<IConversation>("Conversation", ConversationSchema);
