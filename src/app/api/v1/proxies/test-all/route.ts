import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';
import { testingStatus, resetTestingStatus, initTestingStatus, incrementCompleted } from '../test-status/route';
import { testProxy } from '@/lib/proxy-test-service';
import { LogMiddleware } from '@/lib/log-middleware';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';

// 全局异常处理，防止未捕获的连接错误导致崩溃
process.on('uncaughtException', (error: any) => {
  // 对于连接重置错误，只需记录日志而不终止进程
  if (error && error.code === 'ECONNRESET') {
    console.log('代理连接被远程服务器重置，这是正常的清理过程:', error.message);
  } else {
    // 其他未处理的异常仍然打印完整错误信息
    console.error('未捕获异常:', error);
  }
});

// 测试所有代理
export async function POST() {
  try {
    await connectMongoDB();
    
    // 从测试状态模块直接获取测试状态，避免fetch本地API
    const testStatus = {
      inProgress: false,
      completed: 0,
      total: 0,
      ...require('../test-status/route').testingStatus
    };
    
    // 检查是否有测试正在运行
    if (testStatus.inProgress) {
      return NextResponse.json({
        message: `测试正在进行中，已完成 ${testStatus.completed}/${testStatus.total}`,
        inProgress: true,
        completed: testStatus.completed,
        total: testStatus.total
      });
    }
    
    // 获取所有活动的代理
    const proxies = await Proxy.find({ isActive: true });
    
    if (proxies.length === 0) {
      await LogMiddleware.logWarning('proxy', '代理批量测试：没有找到活动的代理', {
        action: 'batch_test_proxies',
        active_proxy_count: 0
      });
      
      return NextResponse.json(
        { message: '没有找到活动的代理' },
        { status: 200 }
      );
    }
    
    // 重置状态
    resetTestingStatus();
    
    // 在返回响应前先初始化代理总数
    initTestingStatus(proxies.length);
    
    // 记录测试开始
    await LogMiddleware.logInfo('proxy', `开始批量测试代理：${proxies.length} 个活动代理`, {
      action: 'batch_test_start',
      proxy_count: proxies.length,
      proxy_details: proxies.map(p => ({ host: p.host, port: p.port, protocol: p.protocol }))
    });
    
    // 直接启动测试，不使用setTimeout
    // 使用Promise确保即使有测试失败也不会影响全局状态
    // 以非阻塞方式执行测试
    runProxyTests(proxies)
      .catch(error => {
        console.error('代理测试过程中出错:', error);
        LogMiddleware.logError('proxy', error, {
          action: 'batch_test_error',
          proxy_count: proxies.length
        });
      })
      .finally(() => console.log('测试引擎启动完成'));
    
    return NextResponse.json({
      message: `开始测试 ${proxies.length} 个活动代理`,
      proxiesCount: proxies.length,
      inProgress: true,
      total: proxies.length,
      completed: 0
    });
  } catch (error) {
    // 记录异常错误
    await LogMiddleware.logError('proxy', error as Error, {
      action: 'batch_test_exception',
      endpoint: '/api/v1/proxies/test-all'
    });
    
    console.error('批量测试代理失败:', error);
    return NextResponse.json(
      { error: '批量测试代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 异步测试所有代理
export async function runProxyTests(proxies: any[]) {
  // 使用Promise.allSettled而非Promise.all，确保即使单个代理测试失败也不会影响整体测试
  console.log(`开始对 ${proxies.length} 个代理进行测试`);
  
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
  
  const testPromises = proxies.map(async (proxy) => {
    try {
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
      // 使用testResult中的精确responseTime，如果没有则使用-1表示测试失败
      proxy.responseTime = testResult.responseTime !== undefined ? testResult.responseTime : -1;
      
      if (!testResult.success) {
        proxy.failureCount = (proxy.failureCount || 0) + 1;
        // 如果测试失败，记录失败原因
        proxy.lastCheckResult = testResult.message || '测试失败';
      } else {
        proxy.failureCount = 0;
        proxy.lastCheckResult = testResult.message || '测试成功';
      }
      
      await proxy.save();
      
      incrementCompleted();
      
      const isValid = testResult.success;
      const responseTimeStr = proxy.responseTime > 0 ? `${proxy.responseTime}ms` : '未测量';
      console.log(`代理 ${proxy.host}:${proxy.port} 测试完成: ${isValid ? '有效' : '无效'}, 延时: ${responseTimeStr} (已完成 ${testingStatus.completed}/${testingStatus.total})`);
      
      return {
        id: proxy._id,
        isValid: isValid,
        responseTime: proxy.responseTime
      };
    } catch (error) {
      console.error(`测试代理 ${proxy.host}:${proxy.port} 时出错:`, error);
      
      // 更新代理为无效
      await Proxy.findByIdAndUpdate(proxy._id, {
        isValid: false,
        lastChecked: new Date(),
        lastCheckResult: error instanceof Error ? error.message : '未知错误'
      });
      
      // 更新测试状态
      incrementCompleted();
      
      return {
        id: proxy._id,
        isValid: false
      };
    } finally {
      // 确保每个测试完成后释放相关资源
      proxy = null; // 帮助垃圾回收
    }
  });
  
  // 分批处理测试，避免同时打开过多连接
  const batchSize = 5; // 每批处理5个代理
  const results = [];
  
  for (let i = 0; i < testPromises.length; i += batchSize) {
    const batch = testPromises.slice(i, i + batchSize);
    const batchSettledResults = await Promise.allSettled(batch);
    
    // 处理每个Promise的结果，无论成功还是失败
    const batchResults = batchSettledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value; // 成功的Promise返回结果
      } else {
        // 失败的Promise，尝试提取相关信息并给一个默认值
        const proxyIndex = i + index;
        const proxy = proxyIndex < proxies.length ? proxies[proxyIndex] : null;
        console.error(`代理批次处理中出现错误(${proxy?.host}:${proxy?.port}):`, result.reason);
        return {
          id: proxy?._id || 'unknown',
          isValid: false,
          error: result.reason
        };
      }
    });
    
    results.push(...batchResults);
    
    // 每批次之间稍微暂停一下，给系统喘息的机会
    if (i + batchSize < testPromises.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 计算统计信息
  const validCount = results.filter(r => r.isValid).length;
  const failedCount = results.length - validCount;
  
  console.log(`所有代理测试完成: 共 ${results.length} 个, 有效 ${validCount} 个, 无效 ${failedCount} 个`);
  
  // 记录测试完成日志
  await LogMiddleware.logInfo('proxy', `代理批量测试完成：${validCount}/${results.length} 可用`, {
    action: 'batch_test_complete',
    total_tested: results.length,
    valid_count: validCount,
    failed_count: failedCount,
    success_rate: results.length > 0 ? (validCount / results.length * 100).toFixed(1) + '%' : '0%',
    valid_proxies: results.filter(r => r.isValid).map(r => r.id).slice(0, 10), // 只记录前10个有效代理ID
    failed_proxies: results.filter(r => !r.isValid).map(r => r.id).slice(0, 10) // 只记录前10个失败代理ID
  });
  
  // 手动触发垃圾回收(尽管Node.js会自动处理，但这里显式提示系统回收资源)
  if (global.gc) {
    try {
      global.gc();
      console.log('手动触发垃圾回收完成');
    } catch (e) {
      console.log('手动触发垃圾回收失败，需使用 --expose-gc 标志启动');
    }
  }
  // 更新测试状态
  testingStatus.inProgress = false;
  
  return {
    total: results.length,
    successful: validCount, 
    failed: results.length - validCount
  };
}
