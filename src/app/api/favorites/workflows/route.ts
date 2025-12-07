/**
 * 工作流收藏 API
 * GET: 获取用户收藏列表
 * POST: 添加收藏
 * DELETE: 移除收藏
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isServerStorage } from '@/lib/storage.types';
export const runtime = 'edge';
// 获取用户收藏列表
export async function GET(request: NextRequest) {
  if (!isServerStorage()) {
    return NextResponse.json({ error: 'D1 storage not enabled' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const favorites = await db.getWorkflowFavorites(Number(userId));
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Failed to get workflow favorites:', error);
    return NextResponse.json({ error: 'Failed to get favorites' }, { status: 500 });
  }
}

// 添加收藏
export async function POST(request: NextRequest) {
  if (!isServerStorage()) {
    return NextResponse.json({ error: 'D1 storage not enabled' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { userId, workflowId } = body;

    if (!userId || !workflowId) {
      return NextResponse.json({ error: 'userId and workflowId are required' }, { status: 400 });
    }

    const success = await db.addWorkflowFavorite(Number(userId), workflowId);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to add workflow favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// 移除收藏
export async function DELETE(request: NextRequest) {
  if (!isServerStorage()) {
    return NextResponse.json({ error: 'D1 storage not enabled' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { userId, workflowId } = body;

    if (!userId || !workflowId) {
      return NextResponse.json({ error: 'userId and workflowId are required' }, { status: 400 });
    }

    const success = await db.removeWorkflowFavorite(Number(userId), workflowId);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to remove workflow favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
