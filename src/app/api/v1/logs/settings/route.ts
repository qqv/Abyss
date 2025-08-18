import { NextRequest } from 'next/server';
import { LogManager } from '@/lib/log-manager';

export async function GET() {
  try {
    const logManager = LogManager.getInstance();
    const settings = await logManager.getSettings();

    return Response.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('获取日志设置失败:', error);
    return Response.json({
      success: false,
      error: '获取日志设置失败'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      enableApiLogs, 
      enableProxyLogs, 
      enableSystemLogs, 
      logLevel, 
      retentionDays, 
      maxLogSize 
    } = body;

    // 验证数据
    if (typeof enableApiLogs !== 'boolean' ||
        typeof enableProxyLogs !== 'boolean' ||
        typeof enableSystemLogs !== 'boolean') {
      return Response.json({
        success: false,
        error: '日志开关必须是布尔值'
      }, { status: 400 });
    }

    if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
      return Response.json({
        success: false,
        error: '无效的日志级别'
      }, { status: 400 });
    }

    if (typeof retentionDays !== 'number' || retentionDays < 1 || retentionDays > 365) {
      return Response.json({
        success: false,
        error: '保留天数必须在1-365之间'
      }, { status: 400 });
    }

    if (typeof maxLogSize !== 'number' || maxLogSize < 10 || maxLogSize > 1000) {
      return Response.json({
        success: false,
        error: '最大日志大小必须在10-1000MB之间'
      }, { status: 400 });
    }

    const logManager = LogManager.getInstance();
    const settings = {
      enableApiLogs,
      enableProxyLogs,
      enableSystemLogs,
      logLevel,
      retentionDays,
      maxLogSize
    };

    await logManager.updateSettings(settings);

    return Response.json({
      success: true,
      message: '日志设置已更新',
      data: settings
    });
  } catch (error) {
    console.error('更新日志设置失败:', error);
    return Response.json({
      success: false,
      error: '更新日志设置失败'
    }, { status: 500 });
  }
}
