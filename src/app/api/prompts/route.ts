/**
 * 提示词 API 路由
 * 支持 GET（获取列表）、POST（新增）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { STORAGE_TYPE } from '@/lib/storage.types';

export const runtime = 'edge';

// 获取所有提示词
export async function GET() {
  try {
    if (STORAGE_TYPE !== 'd1') {
      return NextResponse.json(
        { error: 'This API is only available in D1 storage mode' },
        { status: 400 }
      );
    }

    const prompts = await db.getAllPrompts();
    return NextResponse.json({ prompts, success: true });
  } catch (error) {
    console.error('GET /api/prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts', success: false },
      { status: 500 }
    );
  }
}

// 新增提示词
export async function POST(request: NextRequest) {
  try {
    if (STORAGE_TYPE !== 'd1') {
      return NextResponse.json(
        { error: 'This API is only available in D1 storage mode' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, desc, prompt, category, complexity, type, icon, image, isCustom, userId,tags } = body;

    if (!title || !prompt || !category || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, prompt, category, type', success: false },
        { status: 400 }
      );
    }

    const newPrompt = await db.addPrompt({
      title,
      desc,
      prompt,
      category,
      complexity: complexity || 'beginner',
      type,
      tags,
      isCustom: isCustom ?? true,
    }, userId);

    return NextResponse.json({ prompt: newPrompt, success: true });
  } catch (error) {
    console.error('POST /api/prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt', success: false },
      { status: 500 }
    );
  }
}
