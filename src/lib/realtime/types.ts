export type LiveMessageEvent = {
  type: "message";
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    listingId: string | null;
    body: string;
    read: boolean;
    createdAt: string;
  };
  preview: string;
};
