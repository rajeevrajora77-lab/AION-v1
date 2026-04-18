import mongoose, { Document, Schema } from 'mongoose';

export interface IExecutionMemory extends Document {
  jobId: string;
  userId?: string;
  objective: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial';
  replanCount: number;
  totalTokens: number;
  steps: {
    id: string;
    toolUsed: string;
    input: any;
    output: any;
    error?: string;
    latencyMs: number;
    tokensUsed: number;
  }[];
}

const ExecutionMemorySchema = new Schema({
  jobId: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  objective: { type: String, required: true },
  status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'partial'], default: 'pending' },
  replanCount: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  steps: [{
    id: String,
    toolUsed: String,
    input: Schema.Types.Mixed,
    output: Schema.Types.Mixed,
    error: String,
    latencyMs: Number,
    tokensUsed: Number
  }]
}, { timestamps: true });

export const ExecutionMemory = mongoose.models.ExecutionMemory || mongoose.model<IExecutionMemory>('ExecutionMemory', ExecutionMemorySchema);
