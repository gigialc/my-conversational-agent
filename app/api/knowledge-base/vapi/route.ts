import { NextRequest, NextResponse } from 'next/server';
import { vapiKnowledgeBase } from '@/utils/vapiKnowledgeBase';

export async function POST(request: NextRequest) {
  try {
    const { userId, action, content, timestamp } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'upload') {
      // First check if a knowledge base exists for this user
      let kbId = await vapiKnowledgeBase.getKnowledgeBaseId(userId);
      
      console.log('Knowledge base ID for user:', kbId);
      
      if (!kbId) {
        // Create a new knowledge base if one doesn't exist
        console.log('Creating new knowledge base for user:', userId);
        const kbResponse = await vapiKnowledgeBase.createKnowledgeBase(
          `User_${userId}_KB`,
          content
        );
        kbId = kbResponse.id;
        console.log('Created new KB with ID:', kbId);
      } else {
        // Append to existing knowledge base
        console.log('Appending to existing KB:', kbId);
        try {
          await vapiKnowledgeBase.appendToKnowledgeBase(kbId, content);
          console.log('Successfully appended to KB');
        } catch (error) {
          console.error('KB operation failed:', error);
          // If append fails, try creating a new KB
          console.log('Trying to create a new KB instead');
          const kbResponse = await vapiKnowledgeBase.createKnowledgeBase(
            `User_${userId}_KB_${Date.now()}`,
            content
          );
          kbId = kbResponse.id;
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Conversation saved to knowledge base',
        knowledgeBaseId: kbId
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in knowledge base API:', error);
    return NextResponse.json({ 
      error: 'Failed to process knowledge base operation',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 