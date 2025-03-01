import { NextResponse } from "next/server";
import { vapiKnowledgeBase } from "@/utils/vapiKnowledgeBase";

export async function POST(request: Request) {
  try {
    const { name, content } = await request.json();
    const result = await vapiKnowledgeBase.createKnowledgeBase(name, content);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    return NextResponse.json({ error: 'Failed to create knowledge base' }, { status: 500 });
  }
} 