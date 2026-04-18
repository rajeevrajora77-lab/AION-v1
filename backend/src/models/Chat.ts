import mongoose, { Document, Model, Types } from 'mongoose';
import { ChatMessage } from '../types';

export interface IChat extends Document {
  userId: string;
  sessionId?: string;
  title: string;
  messages: ChatMessage[];
  workspace: string;
  metadata?: {
    model?: string;
    totalTokens?: number;
    averageResponseTime?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  generateTitle(): void;
}

export interface IChatModel extends Model<IChat> {
  getUserStats(userId: string): Promise<{ totalChats: number; totalMessages: number; avgMessagesPerChat: number }>;
  MESSAGE_LIMIT: number;
}

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema<IChat, IChatModel>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
    },
    workspace: { 
      type: String, 
      default: 'default', 
      index: true 
    },
    messages: [messageSchema],
    metadata: {
      model: String,
      totalTokens: Number,
      averageResponseTime: Number,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ userId: 1, updatedAt: -1 });
chatSchema.index({ _id: 1, userId: 1 });
chatSchema.index({ workspace: 1, userId: 1 });
chatSchema.index({ sessionId: 1, createdAt: -1 });
chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Generate conversation title from first user message
chatSchema.methods.generateTitle = function () {
  if (this.messages.length === 0) return;
  const firstMessage = this.messages.find((m: ChatMessage) => m.role === 'user');
  if (firstMessage) {
    this.title =
      firstMessage.content.substring(0, 50) +
      (firstMessage.content.length > 50 ? '...' : '');
  }
};

// Static method to get user's chat statistics
chatSchema.statics.getUserStats = async function (userId: string) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalChats: { $sum: 1 },
        totalMessages: { $sum: { $size: '$messages' } },
        avgMessagesPerChat: { $avg: { $size: '$messages' } },
      },
    },
  ]);

  return stats[0] || { totalChats: 0, totalMessages: 0, avgMessagesPerChat: 0 };
};

// Message limit constant
chatSchema.statics.MESSAGE_LIMIT = 200;

const Chat = mongoose.model<IChat, IChatModel>('Chat', chatSchema);
export default Chat;
