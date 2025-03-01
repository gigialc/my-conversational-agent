import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { KnowledgeBase } from "@/models/KnowledgeBase";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const knowledgeBaseService = {
  async addToKnowledgeBase(userId: string, message: {
    role: string;
    content: string;
    timestamp: string;
    conversationId?: string;
  }) {
    try {
      console.log('📝 KB Service - Adding to KB:', { userId, message });
      
      const payload = {
        operation: 'add',
        userId,
        message
      };
      console.log('📤 KB Service - Request payload:', safeStringify(payload));
      
      const response = await fetch(`${BASE_URL}/api/knowledge-base/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ KB Service - Response error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to add to knowledge base: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ KB Service - Success:', result);
      return result;
    } catch (error) {
      console.error('❌ KB Service - Error:', error);
      throw error;
    }
  },

  async searchKnowledgeBase(userId: string, query: string) {
    try {
      const response = await fetch(`${BASE_URL}/api/knowledge-base/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'search',
          userId,
          query
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to search knowledge base');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return { entries: [] };
    }
  }
};

function safeStringify(obj: any) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
} 