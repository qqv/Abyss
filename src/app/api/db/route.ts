import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db-init';

// 配置路由为动态模式，确保在静态导出时API也能工作
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const connectionStatus = await checkDatabaseConnection();
    
    if (connectionStatus.status === 'connected') {
      return NextResponse.json({ 
        success: true, 
        message: connectionStatus.message 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: connectionStatus.message,
        error: connectionStatus.error
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: '检查数据库连接时出错',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
