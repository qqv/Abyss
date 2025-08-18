import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { ProxyPoolConfig } from '@/models/Proxy';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取代理池配置
export async function GET() {
  try {
    await connectMongoDB();
    
    // 获取当前代理池配置，如果不存在则使用默认配置
    let config = await ProxyPoolConfig.findOne({}).sort({ updatedAt: -1 }).lean();
    
    if (!config) {
      // 创建默认配置，使用新的字段结构
      const defaultConfig = new ProxyPoolConfig({
        // 代理验证设置
        checkProxiesOnStartup: true,
        enableHealthCheck: false,
        proxyHealthCheckInterval: 60, // 60分钟
        maxFailuresBeforeRemoval: 5,
        
        // 性能设置
        connectionTimeout: 5000, // 5秒
        requestTimeout: 10000, // 10秒
        maxConcurrentChecks: 10,
        
        // 重试设置
        maxRetries: 2,
        retryDelay: 1000, // 1秒
        enableConnectionRetry: true,
        
        // 自动管理设置
        autoRemoveInvalidProxies: false,
        retryFailedProxies: true,
        
        // 日志和监控
        enableDetailedLogging: false,
        keepStatisticsHistory: true,
        
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await defaultConfig.save();
      config = defaultConfig.toObject();
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('获取代理池配置失败:', error);
    return NextResponse.json(
      { error: '获取代理池配置失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 更新代理池配置
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    await connectMongoDB();
    
    // 获取当前配置
    let config = await ProxyPoolConfig.findOne({}).sort({ updatedAt: -1 });
    
    if (!config) {
      // 如果不存在配置，创建新配置
      config = new ProxyPoolConfig({
        selectionMode: 'random',
        autoRotationInterval: 300,
        checkProxiesOnStartup: true,
        validateOnFailure: true,
        maxFailures: 3,
      });
    }
    
    // 更新配置字段
    if (body.selectionMode) {
      config.selectionMode = body.selectionMode;
    }
    
    if (body.autoRotationInterval !== undefined) {
      config.autoRotationInterval = body.autoRotationInterval;
    }
    
    if (body.checkProxiesOnStartup !== undefined) {
      config.checkProxiesOnStartup = body.checkProxiesOnStartup;
    }
    
    if (body.validateOnFailure !== undefined) {
      config.validateOnFailure = body.validateOnFailure;
    }
    
    if (body.maxFailures !== undefined) {
      config.maxFailures = body.maxFailures;
    }
    
    if (body.proxyHealthCheckInterval !== undefined) {
      config.proxyHealthCheckInterval = body.proxyHealthCheckInterval;
    }
    
    if (body.maxFailuresBeforeRemoval !== undefined) {
      config.maxFailuresBeforeRemoval = body.maxFailuresBeforeRemoval;
    }
    
    if (body.connectionTimeout !== undefined) {
      config.connectionTimeout = body.connectionTimeout;
    }
    
    if (body.requestTimeout !== undefined) {
      config.requestTimeout = body.requestTimeout;
    }
    
    if (body.maxConcurrentChecks !== undefined) {
      config.maxConcurrentChecks = body.maxConcurrentChecks;
    }
    
    if (body.autoRemoveInvalidProxies !== undefined) {
      config.autoRemoveInvalidProxies = body.autoRemoveInvalidProxies;
    }
    
    if (body.retryFailedProxies !== undefined) {
      config.retryFailedProxies = body.retryFailedProxies;
    }
    
    if (body.enableDetailedLogging !== undefined) {
      config.enableDetailedLogging = body.enableDetailedLogging;
    }
    
    if (body.keepStatisticsHistory !== undefined) {
      config.keepStatisticsHistory = body.keepStatisticsHistory;
    }
    
    config.updatedAt = new Date();
    await config.save();
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('更新代理池配置失败:', error);
    return NextResponse.json(
      { error: '更新代理池配置失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
