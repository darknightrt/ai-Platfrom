/**
 * 管理员设置 API
 * GET /api/admin/settings - 获取设置
 * POST /api/admin/settings - 更新设置
 * 
 * 注意：此 API 仅在 D1 模式下可用
 * localStorage 模式下设置存储在客户端
 */

import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_TYPE } from '@/lib/storage.types';
import { db } from '@/lib/db';

export const runtime = 'edge';

/**
 * 获取管理员设置
 */
export async function GET(request: NextRequest) {
  try {
    // 仅 D1 模式支持
    if (STORAGE_TYPE !== 'd1') {
      return NextResponse.json(
        { error: 'Admin settings API only available in D1 mode' },
        { status: 400 }
      );
    }
    
    const settings = await db.getAdminSettings();
    return NextResponse.json({ success: true, data: settings });
    
  } catch (error) {
    console.error('Failed to get admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to get admin settings' },
      { status: 500 }
    );
  }
}

/**
 * 更新管理员设置
 */
export async function POST(request: NextRequest) {
  try {
    // 仅 D1 模式支持
    if (STORAGE_TYPE !== 'd1') {
      return NextResponse.json(
        { error: 'Admin settings API only available in D1 mode' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const success = await db.updateAdminSettings(body);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to update admin settings' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Failed to update admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to update admin settings' },
      { status: 500 }
    );
  }
}
