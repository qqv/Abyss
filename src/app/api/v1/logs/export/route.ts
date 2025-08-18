import { NextRequest } from 'next/server';
import { LogManager } from '@/lib/log-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const level = searchParams.get('level') || 'all';
    const category = searchParams.get('category') || 'all';
    const format = searchParams.get('format') || 'json'; // json, csv, txt

    const logManager = LogManager.getInstance();
    const result = await logManager.getLogs({
      search,
      level: level === 'all' ? undefined : level as any,
      category: category === 'all' ? undefined : category as any,
      page: 1,
      limit: 10000 // 导出时获取所有匹配的日志
    });

    let content: string;
    let contentType: string;
    let filename: string;

    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'csv':
        content = logManager.exportToCsv(result.logs);
        contentType = 'text/csv';
        filename = `abyss-logs-${timestamp}.csv`;
        break;
      case 'txt':
        content = logManager.exportToText(result.logs);
        contentType = 'text/plain';
        filename = `abyss-logs-${timestamp}.txt`;
        break;
      default:
        content = JSON.stringify(result.logs, null, 2);
        contentType = 'application/json';
        filename = `abyss-logs-${timestamp}.json`;
    }

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('导出日志失败:', error);
    return Response.json({
      success: false,
      error: '导出日志失败'
    }, { status: 500 });
  }
}
