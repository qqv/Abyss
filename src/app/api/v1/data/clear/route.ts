import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Collection } from '@/models/Collection';
import { Environment } from '@/models/Environment';
import { Proxy } from '@/models/Proxy';
import { TestJob } from '@/models/TestJob';
import { LogManager } from '@/lib/log-manager';
import { LogMiddleware } from '@/lib/log-middleware';

export async function DELETE(request: NextRequest) {
  try {
    const { type } = await request.json();
    
    await connectMongoDB();
    
    LogMiddleware.logInfo('data-clear', `开始清理数据: ${type}`, { type });

    let result = { success: true, message: '', details: {} };

    switch (type) {
      case 'cache':
        // 清理缓存数据 - 这里我们可以清理一些临时数据
        // 例如，清理过期的测试结果或临时文件
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const deletedExpiredJobs = await TestJob.deleteMany({
          createdAt: { $lt: oneWeekAgo }
        });
        
        result.message = '缓存数据已清理';
        result.details = {
          expiredTestJobsDeleted: deletedExpiredJobs.deletedCount
        };
        break;

      case 'logs':
        // 清理日志数据
        const logManager = LogManager.getInstance();
        await logManager.clearLogs();
        
        result.message = '日志数据已清理';
        break;

      case 'history':
        // 清理历史记录 - 删除所有测试结果
        const deletedTestJobs = await TestJob.deleteMany({});
        
        result.message = '历史记录已清理';
        result.details = {
          testJobsDeleted: deletedTestJobs.deletedCount
        };
        break;

      case 'all':
        // 清理所有临时数据
        const [deletedAllTestJobs] = await Promise.all([
          TestJob.deleteMany({}),
          // 清理日志
          LogManager.getInstance().clearLogs()
        ]);
        
        result.message = '所有临时数据已清理';
        result.details = {
          testJobsDeleted: deletedAllTestJobs.deletedCount,
          logsCleared: true
        };
        break;

      case 'collections':
        // 清理所有集合（谨慎操作）
        const deletedCollections = await Collection.deleteMany({});
        result.message = '所有API集合已清理';
        result.details = {
          collectionsDeleted: deletedCollections.deletedCount
        };
        break;

      case 'environments':
        // 清理所有环境配置
        const deletedEnvironments = await Environment.deleteMany({});
        result.message = '所有环境配置已清理';
        result.details = {
          environmentsDeleted: deletedEnvironments.deletedCount
        };
        break;

      case 'proxies':
        // 清理所有代理配置
        const deletedProxies = await Proxy.deleteMany({});
        result.message = '所有代理配置已清理';
        result.details = {
          proxiesDeleted: deletedProxies.deletedCount
        };
        break;

      case 'failed-proxies':
        // 清理失败的代理
        const deletedFailedProxies = await Proxy.deleteMany({
          status: { $in: ['failed', 'error', 'timeout'] }
        });
        result.message = '失败的代理已清理';
        result.details = {
          failedProxiesDeleted: deletedFailedProxies.deletedCount
        };
        break;

      case 'browser-data':
        // 清理浏览器存储的数据（前端处理）
        result.message = '浏览器数据清理指令已发送';
        result.details = {
          clearBrowserStorage: true
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid clear type' },
          { status: 400 }
        );
    }

    LogMiddleware.logInfo('data-clear', `数据清理完成: ${type}`, { 
      type, 
      result: result.details 
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error clearing data:', error);
    LogMiddleware.logError('data-clear', '数据清理失败', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}

// 获取可清理的数据类型和统计
export async function GET(request: NextRequest) {
  try {
    await connectMongoDB();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalTestJobs,
      expiredTestJobs,
      totalCollections,
      totalEnvironments,
      totalProxies,
      failedProxies
    ] = await Promise.all([
      TestJob.countDocuments(),
      TestJob.countDocuments({ createdAt: { $lt: oneWeekAgo } }),
      Collection.countDocuments(),
      Environment.countDocuments(),
      Proxy.countDocuments(),
      Proxy.countDocuments({ status: { $in: ['failed', 'error', 'timeout'] } })
    ]);

    // 获取日志数量
    let logCount = 0;
    try {
      const logManager = LogManager.getInstance();
      const logs = await logManager.getLogs({ limit: 1 });
      logCount = logs.total;
    } catch (error) {
      // 忽略日志获取错误
    }

    const clearableData = {
      cache: {
        description: '清理缓存数据（过期的测试结果）',
        count: expiredTestJobs,
        type: 'expired-test-jobs'
      },
      logs: {
        description: '清理所有日志记录',
        count: logCount,
        type: 'log-entries'
      },
      history: {
        description: '清理所有测试历史记录',
        count: totalTestJobs,
        type: 'test-jobs'
      },
      collections: {
        description: '清理所有API集合',
        count: totalCollections,
        type: 'collections'
      },
      environments: {
        description: '清理所有环境配置',
        count: totalEnvironments,
        type: 'environments'
      },
      proxies: {
        description: '清理所有代理配置',
        count: totalProxies,
        type: 'proxies'
      },
      failedProxies: {
        description: '清理失败的代理配置',
        count: failedProxies,
        type: 'failed-proxies'
      }
    };

    return NextResponse.json({ 
      success: true, 
      data: clearableData 
    });

  } catch (error) {
    console.error('Error fetching clearable data info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clearable data info' },
      { status: 500 }
    );
  }
}
