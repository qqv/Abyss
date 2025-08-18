import { NextRequest } from 'next/server';
import { LogManager } from '@/lib/log-manager';
import { LogMiddleware } from '@/lib/log-middleware';

export async function POST() {
  try {
    // 添加一些测试日志
    const testLogs = [
      {
        level: 'info' as const,
        category: 'api' as const,
        message: 'API测试日志',
        details: { 
          url: '/api/test', 
          method: 'POST', 
          status: 200,
          timestamp: new Date().toISOString()
        }
      },
      {
        level: 'error' as const,
        category: 'proxy' as const,
        message: '测试代理连接失败',
        details: { 
          proxy: '127.0.0.1:8080', 
          error: 'Connection refused',
          timestamp: new Date().toISOString()
        }
      },
      {
        level: 'warn' as const,
        category: 'system' as const,
        message: '测试系统警告',
        details: { 
          component: 'log-manager',
          message: 'Test warning message',
          timestamp: new Date().toISOString()
        }
      }
    ];

    for (const log of testLogs) {
      await LogMiddleware.logInfo(log.category, log.message, log.details);
    }

    return Response.json({
      success: true,
      message: '测试日志已添加',
      count: testLogs.length
    });
  } catch (error) {
    console.error('添加测试日志失败:', error);
    return Response.json({
      success: false,
      error: '添加测试日志失败'
    }, { status: 500 });
  }
}
