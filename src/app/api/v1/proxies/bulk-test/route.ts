import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';
import { testProxy } from '@/lib/proxy-test-service';
import { resetTestingStatus, initTestingStatus, incrementCompleted } from '../test-status/route';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';

// 批量测试代理
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proxyIds } = body; // 可选参数，若不提供则测试所有代理

    await connectMongoDB();
    
    let proxiesToTest;
    if (Array.isArray(proxyIds) && proxyIds.length > 0) {
      // 测试指定的代理
      proxiesToTest = await Proxy.find({ _id: { $in: proxyIds } });
    } else {
      // 测试所有代理（但以活跃的为优先）
      proxiesToTest = await Proxy.find({}).sort({ isActive: -1 });
    }

    if (proxiesToTest.length === 0) {
      return NextResponse.json({ 
        message: '没有找到需要测试的代理',
        total: 0,
        valid: 0,
        invalid: 0
      });
    }

    // 重置并初始化测试状态
    resetTestingStatus();
    initTestingStatus(proxiesToTest.length);

    // 启动异步测试进程
    const testProcess = async () => {
      let valid = 0;
      let invalid = 0;

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

      for (const proxy of proxiesToTest) {
        try {
          // 使用统一的代理测试服务，传递配置选项
          const result = await testProxy({
            host: proxy.host,
            port: proxy.port,
            protocol: proxy.protocol,
            username: proxy.username,
            password: proxy.password
          }, testOptions);
          
          // 更新代理状态
          await Proxy.updateOne(
            { _id: proxy._id },
            { 
              $set: {
                isValid: result.success,
                responseTime: result.responseTime || -1,
                lastChecked: new Date(),
                failureCount: result.success ? 0 : (proxy.failureCount || 0) + 1
              }
            }
          );
          
          if (result.success) {
            valid++;
          } else {
            invalid++;
          }
          
          // 更新测试进度
          incrementCompleted();
          console.log(`代理 ${proxy.host}:${proxy.port} 测试完成: ${result.success ? '有效' : '无效'}`);
        } catch (error) {
          console.error(`测试代理失败 ${proxy.host}:${proxy.port}:`, error);
          
          // 记录失败
          await Proxy.updateOne(
            { _id: proxy._id },
            { 
              $set: {
                isValid: false,
                lastChecked: new Date(),
                failureCount: (proxy.failureCount || 0) + 1
              }
            }
          );
          
          invalid++;
          
          // 更新测试进度
          incrementCompleted();
          console.log(`代理 ${proxy.host}:${proxy.port} 测试失败`);
        }
      }
      
      console.log(`代理测试完成: 总数=${proxiesToTest.length}, 有效=${valid}, 无效=${invalid}`);
    };
    
    // 启动异步测试进程，不等待其完成
    testProcess().catch(err => console.error('代理测试进程错误:', err));
    
    return NextResponse.json({
      message: `开始测试 ${proxiesToTest.length} 个代理，测试将在后台进行`,
      total: proxiesToTest.length,
      inProgress: true
    });
  } catch (error) {
    console.error('批量测试代理失败:', error);
    return NextResponse.json({ 
      error: '服务器错误', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
