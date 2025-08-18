import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Collection } from '@/models/Collection';
import { Environment } from '@/models/Environment';
import { Proxy } from '@/models/Proxy';
import { TestJob } from '@/models/TestJob';
import { LogManager } from '@/lib/log-manager';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    await connectMongoDB();

    // 获取各种数据的统计
    const [collections, environments, testResults, proxies] = await Promise.all([
      Collection.countDocuments(),
      Environment.countDocuments(), 
      TestJob.countDocuments(),
      Proxy.countDocuments()
    ]);

    // 计算数据大小（估算）
    let totalSize = 0;
    
    // 获取集合数据大小
    if (collections > 0) {
      const sampleCollection = await Collection.findOne();
      if (sampleCollection) {
        const avgCollectionSize = JSON.stringify(sampleCollection).length;
        totalSize += avgCollectionSize * collections;
      }
    }

    // 获取环境配置大小
    if (environments > 0) {
      const sampleEnvironment = await Environment.findOne();
      if (sampleEnvironment) {
        const avgEnvironmentSize = JSON.stringify(sampleEnvironment).length;
        totalSize += avgEnvironmentSize * environments;
      }
    }

    // 获取测试结果大小
    if (testResults > 0) {
      const sampleTestJob = await TestJob.findOne();
      if (sampleTestJob) {
        const avgTestJobSize = JSON.stringify(sampleTestJob).length;
        totalSize += avgTestJobSize * testResults;
      }
    }

    // 获取代理配置大小
    if (proxies > 0) {
      const sampleProxy = await Proxy.findOne();
      if (sampleProxy) {
        const avgProxySize = JSON.stringify(sampleProxy).length;
        totalSize += avgProxySize * proxies;
      }
    }

    // 获取日志文件大小
    try {
      const logManager = LogManager.getInstance();
      const logFilePath = logManager.getLogFilePath();
      const logStats = await fs.stat(logFilePath);
      totalSize += logStats.size;
    } catch (error) {
      // 日志文件可能不存在，忽略错误
    }

    // 格式化文件大小
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const stats = {
      collections,
      environments,
      testResults,
      proxyConfigs: proxies,
      totalSize: formatSize(totalSize)
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching data stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data statistics' },
      { status: 500 }
    );
  }
}
