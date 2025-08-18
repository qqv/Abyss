import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';
import { testProxy } from '@/lib/proxy-test-service';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';

// 测试代理
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await connectMongoDB();
    
    // 获取代理信息
    const proxy = await Proxy.findById(id);
    if (!proxy) {
      return NextResponse.json(
        { error: '未找到代理' },
        { status: 404 }
      );
    }

    // 加载代理配置以获取重试设置
    let proxyConfig;
    try {
      const configResponse = await fetch('http://localhost:3000/api/v1/proxy-config', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (configResponse.ok) {
        proxyConfig = await configResponse.json();
      }
    } catch (error) {
      console.warn('无法加载代理配置，使用默认值:', error);
    }
    
    // 准备测试选项
    const testOptions = {
      maxRetries: proxyConfig?.maxRetries ?? 2,
      retryDelay: proxyConfig?.retryDelay ?? 1000,
      enableConnectionRetry: proxyConfig?.enableConnectionRetry ?? true,
      connectionTimeout: proxyConfig?.connectionTimeout ?? 15000,
      requestTimeout: proxyConfig?.requestTimeout ?? 8000,
      enableDetailedLogging: proxyConfig?.enableDetailedLogging ?? false
    };

    // 使用统一的代理测试服务，传递配置选项
    const testResult = await testProxy({
      host: proxy.host,
      port: proxy.port,
      protocol: proxy.protocol,
      username: proxy.username,
      password: proxy.password
    }, testOptions);
    
    // 更新代理状态
    proxy.isValid = testResult.success;
    proxy.lastChecked = new Date();
    
    if (testResult.responseTime !== undefined) {
      proxy.responseTime = testResult.responseTime;
    }
    
    if (!testResult.success) {
      proxy.failureCount = (proxy.failureCount || 0) + 1;
    } else {
      proxy.failureCount = 0;
    }
    
    await proxy.save();
    
    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data,
      proxyId: proxy._id,
      responseTime: testResult.responseTime
    });
  } catch (error) {
    console.error(`测试代理 ${params.id} 失败:`, error);
    return NextResponse.json(
      { error: '测试代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
