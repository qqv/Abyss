import { NextRequest, NextResponse } from 'next/server';
import { LogManager } from './log-manager';

export interface LogContext {
  requestId: string;
  userAgent?: string;
  ip?: string;
  method: string;
  url: string;
  startTime: number;
}

export class LogMiddleware {
  private static logManager = LogManager.getInstance();

  // API请求日志中间件
  static async logApiRequest(
    request: NextRequest,
    response: NextResponse,
    context: LogContext
  ) {
    try {
      const { requestId, method, url, startTime, userAgent, ip } = context;
      const duration = Date.now() - startTime;
      const status = response.status;

      const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
      const message = `${method} ${url} ${status} - ${duration}ms`;

      const details = {
        requestId,
        method,
        url,
        status,
        duration,
        userAgent,
        ip,
        responseSize: response.headers.get('content-length') || 'unknown'
      };

      await this.logManager.addLog({
        level,
        category: 'api',
        message,
        details
      });
    } catch (error) {
      console.error('记录API请求日志失败:', error);
    }
  }

  // 系统日志
  static async logSystem(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    details?: any
  ) {
    try {
      await this.logManager.addLog({
        level,
        category: 'system',
        message,
        details
      });
    } catch (error) {
      console.error('记录系统日志失败:', error);
    }
  }

  // 代理日志
  static async logProxy(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    details?: any
  ) {
    try {
      await this.logManager.addLog({
        level,
        category: 'proxy',
        message,
        details
      });
    } catch (error) {
      console.error('记录代理日志失败:', error);
    }
  }

  // 代理连接日志
  static async logProxyConnection(
    proxyHost: string,
    proxyPort: number,
    success: boolean,
    responseTime?: number,
    error?: string
  ) {
    const level = success ? 'info' : 'error';
    const message = success 
      ? `代理连接成功: ${proxyHost}:${proxyPort}`
      : `代理连接失败: ${proxyHost}:${proxyPort}`;

    const details = {
      proxyHost,
      proxyPort,
      success,
      responseTime,
      error
    };

    await this.logProxy(level, message, details);
  }

  // 代理测试日志
  static async logProxyTest(
    proxyId: string,
    proxyHost: string,
    proxyPort: number,
    testUrl: string,
    success: boolean,
    responseTime?: number,
    error?: string
  ) {
    const level = success ? 'info' : 'warn';
    const message = success 
      ? `代理测试通过: ${proxyHost}:${proxyPort} (${responseTime}ms)`
      : `代理测试失败: ${proxyHost}:${proxyPort}`;

    const details = {
      proxyId,
      proxyHost,
      proxyPort,
      testUrl,
      success,
      responseTime,
      error
    };

    await this.logProxy(level, message, details);
  }

  // 集合运行日志
  static async logCollectionRun(
    collectionId: string,
    collectionName: string,
    requestCount: number,
    successCount: number,
    duration: number,
    details?: any
  ) {
    const level = successCount === requestCount ? 'info' : 'warn';
    const message = `集合运行完成: ${collectionName} (${successCount}/${requestCount} 成功, ${duration}ms)`;

    await this.logSystem(level, message, {
      collectionId,
      collectionName,
      requestCount,
      successCount,
      failedCount: requestCount - successCount,
      duration,
      ...details
    });
  }

  // 错误日志
  static async logError(
    category: 'api' | 'proxy' | 'system',
    error: Error | string,
    context?: any
  ) {
    const message = error instanceof Error ? error.message : error;
    const details = {
      stack: error instanceof Error ? error.stack : undefined,
      context
    };

    await this.logManager.addLog({
      level: 'error',
      category,
      message,
      details
    });
  }

  // 警告日志
  static async logWarning(
    category: 'api' | 'proxy' | 'system',
    message: string,
    details?: any
  ) {
    await this.logManager.addLog({
      level: 'warn',
      category,
      message,
      details
    });
  }

  // 信息日志
  static async logInfo(
    category: 'api' | 'proxy' | 'system',
    message: string,
    details?: any
  ) {
    await this.logManager.addLog({
      level: 'info',
      category,
      message,
      details
    });
  }

  // 调试日志
  static async logDebug(
    category: 'api' | 'proxy' | 'system',
    message: string,
    details?: any
  ) {
    await this.logManager.addLog({
      level: 'debug',
      category,
      message,
      details
    });
  }
}

// 全局错误处理器
export function setupGlobalErrorLogging() {
  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    LogMiddleware.logError('system', error, { type: 'uncaughtException' });
  });

  // 未处理的Promise rejection
  process.on('unhandledRejection', (reason, promise) => {
    LogMiddleware.logError('system', `Unhandled Rejection: ${reason}`, { 
      type: 'unhandledRejection',
      promise: promise.toString()
    });
  });
}

// 创建请求日志装饰器
export function withApiLogging(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const requestId = Math.random().toString(36).substr(2, 9);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    const context: LogContext = {
      requestId,
      method,
      url,
      startTime,
      userAgent,
      ip
    };

    try {
      const response = await handler(request, ...args);
      
      // 记录成功的请求
      await LogMiddleware.logApiRequest(request, response, context);
      
      return response;
    } catch (error) {
      // 记录错误的请求
      const errorResponse = NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
      
      await LogMiddleware.logApiRequest(request, errorResponse, context);
      await LogMiddleware.logError('api', error as Error, context);
      
      throw error;
    }
  };
}
