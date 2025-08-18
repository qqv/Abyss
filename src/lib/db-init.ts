import { connectMongoDB } from './mongodb';
import mongoose from 'mongoose';
import { Collection } from '../models/Collection';
import { TestJob } from '../models/TestJob';
import { Proxy, ProxyPoolConfig } from '../models/Proxy';

/**
 * 初始化数据库连接和必要的数据
 */
export const initDatabase = async () => {
  // 连接到MongoDB
  await connectMongoDB();
  console.log('🔄 数据库初始化中...');
  
  // 初始化代理池配置（如果不存在）
  const proxyConfigCount = await ProxyPoolConfig.countDocuments();
  if (proxyConfigCount === 0) {
    await ProxyPoolConfig.create({
      selectionMode: 'random',
      autoRotationInterval: 300,
      checkProxiesOnStartup: true,
      validateOnFailure: true,
      maxFailures: 3
    });
    console.log('✅ 代理池配置已初始化');
  }
  
  // 环境变量初始化已移除
  
  console.log('✅ 数据库初始化完成');
  return true;
};

/**
 * 检查数据库连接状态
 */
export const checkDatabaseConnection = async () => {
  try {
    // 尝试连接数据库
    await connectMongoDB();
    
    // 检查 Mongoose 连接状态
    const readyState = mongoose.connection.readyState;
    const readyStates: Record<number, string> = {
      0: '未连接',
      1: '已连接',
      2: '正在连接',
      3: '断开连接中',
      99: '未初始化'
    };
    
    if (readyState === 1) {
      // 检查各个集合并返回更详细的状态信息
      const db = mongoose.connection.db;
      if (!db) {
        return { 
          success: false,
          status: 'error', 
          message: '数据库连接异常：db对象未初始化'
        };
      }
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((col: any) => col.name);
      
      return { 
        success: true,
        status: 'connected', 
        message: '数据库连接成功',
        details: {
          dbName: db?.databaseName || 'unknown',
          collections: collectionNames,
          collectionsCount: collectionNames.length,
          connectionState: readyStates[readyState as keyof typeof readyStates] || '未知状态'
        }
      };
    } else {
      return {
        success: false, 
        status: 'connecting',
        message: `数据库连接中: ${readyStates[readyState as keyof typeof readyStates] || '未知状态'}`,
        details: {
          connectionState: readyStates[readyState as keyof typeof readyStates] || '未知状态'
        }
      };
    }
  } catch (error) {
    console.error('数据库连接失败:', error);
    return { 
      success: false,
      status: 'disconnected', 
      message: '数据库连接失败', 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 如果这是一个直接运行的脚本，则执行初始化
if (require.main === module) {
  initDatabase().then(() => {
    console.log('初始化完成，程序将退出');
    process.exit(0);
  }).catch((err) => {
    console.error('初始化失败:', err);
    process.exit(1);
  });
}
