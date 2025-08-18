import { NextRequest, NextResponse } from 'next/server';
import { LogManager } from '@/lib/log-manager';

// 获取全局日志记录设置
export async function GET() {
  try {
    const enabled = LogManager.isGlobalRequestLoggingEnabled();
    
    return NextResponse.json({
      success: true,
      data: {
        enableRequestLogging: enabled
      }
    });
  } catch (error) {
    console.error('获取全局日志设置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取全局日志设置失败' },
      { status: 500 }
    );
  }
}

// 设置全局日志记录开关
export async function PUT(request: NextRequest) {
  try {
    const { enableRequestLogging } = await request.json();
    
    if (typeof enableRequestLogging !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enableRequestLogging 必须是布尔值' },
        { status: 400 }
      );
    }
    
    LogManager.setGlobalRequestLogging(enableRequestLogging);
    
    return NextResponse.json({
      success: true,
      data: {
        enableRequestLogging
      }
    });
  } catch (error) {
    console.error('设置全局日志开关失败:', error);
    return NextResponse.json(
      { success: false, error: '设置全局日志开关失败' },
      { status: 500 }
    );
  }
}
