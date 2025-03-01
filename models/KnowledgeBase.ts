import mongoose, { Schema } from 'mongoose';

interface KnowledgeBaseEntry {
  role: string;
  content: string;
  timestamp: string;
  conversationId?: string;
  tags?: string[];
}

interface KnowledgeBaseDocument extends mongoose.Document {
  userId: string;
  entries: KnowledgeBaseEntry[];
  lastUpdated: Date;
}

const KnowledgeBaseSchema = new Schema<KnowledgeBaseDocument>({
  userId: { type: String, required: true, index: true },
  entries: [{
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
    conversationId: { type: String },
    tags: [{ type: String }]
  }],
  lastUpdated: { type: Date, default: Date.now }
});

// Create a compound index for efficient searching
KnowledgeBaseSchema.index({ userId: 1, 'entries.conversationId': 1 });

export const KnowledgeBase = mongoose.models.KnowledgeBase || 
  mongoose.model<KnowledgeBaseDocument>('KnowledgeBase', KnowledgeBaseSchema); 