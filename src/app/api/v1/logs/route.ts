import { NextRequest } from 'next/server';
import { LogManager } from '@/lib/log-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const level = searchParams.get('level') || 'all';
    const category = searchParams.get('category') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const logManager = LogManager.getInstance();
    const result = await logManager.getLogs({
      search,
      level: level === 'all' ? undefined : level as any,
      category: category === 'all' ? undefined : category as any,
      page,
      limit
    });

    return Response.json({
      success: true,
      data: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('获取日志失败:', error);
    return Response.json({
      success: false,
      error: '获取日志失败'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, category, message, details } = body;

    if (!level || !category || !message) {
      return Response.json({
        success: false,
        error: '缺少必需的参数'
      }, { status: 400 });
    }

    const logManager = LogManager.getInstance();
    await logManager.addLog({
      level,
      category,
      message,
      details
    });

    return Response.json({
      success: true,
      message: '日志记录成功'
    });
  } catch (error) {
    console.error('记录日志失败:', error);
    return Response.json({
      success: false,
      error: '记录日志失败'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const logManager = LogManager.getInstance();
    await logManager.clearLogs();

    return Response.json({
      success: true,
      message: '日志清理成功'
    });
  } catch (error) {
    console.error('清理日志失败:', error);
    return Response.json({
      success: false,
      error: '清理日志失败'
    }, { status: 500 });
  }
}
