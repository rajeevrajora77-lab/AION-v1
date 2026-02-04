import mongoose from 'mongoose';

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

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
    },
    messages: [messageSchema],
    metadata: {
      model: String,
      totalTokens: Number,
      averageResponseTime: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
chatSchema.index({ userId: 1, createdAt: -1 }); // User's chats sorted by date
chatSchema.index({ userId: 1, updatedAt: -1 }); // User's chats sorted by last update
chatSchema.index({ sessionId: 1, createdAt: -1 });

// TTL index to auto-delete after 90 days
chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Auto-update updatedAt on save
chatSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Generate conversation title from first user message
chatSchema.methods.generateTitle = function () {
  if (this.messages.length === 0) return;
  const firstMessage = this.messages.find((m) => m.role === 'user');
  if (firstMessage) {
    this.title =
      firstMessage.content.substring(0, 50) +
      (firstMessage.content.length > 50 ? '...' : '');
  }
};

// Static method to get user's chat statistics
chatSchema.statics.getUserStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
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

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
