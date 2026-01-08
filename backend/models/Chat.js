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
    sessionId: {
      type: String,
      required: true,
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

// Index for efficient queries
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

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
