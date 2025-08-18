/**
 * 代理请求API端点
 * 用于通过代理发送请求，从而避免在客户端直接使用代理相关库
 */
import { NextResponse } from 'next/server';
import { sendRequestViaProxy } from '@/app/api/services/server-request-service';
import { LogMiddleware } from '@/lib/log-middleware';

export interface ProxyRequestBody {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  proxy?: {
    host: string;
    port: number;
    protocol: string;
    username?: string;
    password?: string;
  };
  timeout?: number;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let requestUrl = '';
  let requestMethod = '';
  let proxyInfo = null;

  try {
    const body: ProxyRequestBody = await request.json();
    const { url, method, headers = {}, body: requestBody, proxy, timeout = 30000 } = body;
    
    requestUrl = url;
    requestMethod = method;
    proxyInfo = proxy;

    if (!url) {
      await LogMiddleware.logWarning('api', '代理请求失败：缺少请求URL', {
        action: 'proxy_request',
        error: '缺少请求URL',
        provided_params: Object.keys(body)
      });
      
      return NextResponse.json({ 
        success: false, 
        error: '缺少请求URL' 
      }, { status: 400 });
    }
    
    // 记录请求开始
    await LogMiddleware.logInfo('api', `开始代理请求：${method} ${url}`, {
      action: 'proxy_request_start',
      url,
      method,
      proxy: proxy ? `${proxy.host}:${proxy.port}` : 'none',
      protocol: proxy?.protocol,
      timeout,
      has_auth: !!(proxy?.username && proxy?.password)
    });
    
    // 使用服务器端请求服务发送请求
    const result = await sendRequestViaProxy({
      url,
      method,
      headers,
      body: requestBody,
      proxy,
      timeout
    });
    
    const duration = Date.now() - startTime;
    
    // 记录请求结果
    if (result.success) {
      await LogMiddleware.logInfo('api', `代理请求成功：${method} ${url} ${result.status}`, {
        action: 'proxy_request_success',
        url,
        method,
        status: result.status,
        duration,
        proxy: proxy ? `${proxy.host}:${proxy.port}` : 'none',
        response_size: result.data ? JSON.stringify(result.data).length : 0
      });
    } else {
      await LogMiddleware.logError('api', `代理请求失败：${method} ${url}`, {
        action: 'proxy_request_error',
        url,
        method,
        duration,
        proxy: proxy ? `${proxy.host}:${proxy.port}` : 'none',
        error: result.error,
        status: result.status
      });
    }
    
    // 无论成功或失败，都返回 200，由前端根据 success 字段判断
    return NextResponse.json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // 记录异常错误
    await LogMiddleware.logError('api', `代理请求异常：${requestMethod} ${requestUrl}`, {
      action: 'proxy_request_exception',
      url: requestUrl,
      method: requestMethod,
      duration,
      proxy: proxyInfo ? `${proxyInfo.host}:${proxyInfo.port}` : 'none',
      error: error.message,
      stack: error.stack
    });
    
    console.error('通过代理发送请求失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '处理请求失败' 
    }, { status: 200 });
  }
}
