import { LogManager } from './log-manager';

export async function initializeSampleLogs() {
  const logManager = LogManager.getInstance();

  // 在客户端环境中，从localStorage读取设置并同步到LogManager
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const savedSettings = localStorage.getItem('abyss-general-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (typeof settings.enableRequestLogging === 'boolean') {
          LogManager.setGlobalRequestLogging(settings.enableRequestLogging);
          console.log('已同步请求日志设置:', settings.enableRequestLogging);
        }
      }
    } catch (error) {
      console.warn('Failed to sync request logging setting from localStorage:', error);
    }
  }

  // 添加一些示例日志数据
  const sampleLogs = [
    {
      level: 'info' as const,
      category: 'api' as const,
      message: 'API请求成功',
      details: { 
        url: 'https://api.example.com/users', 
        method: 'GET', 
        status: 200,
        responseTime: 150,
        requestId: 'req_123456'
      }
    },
    {
      level: 'error' as const,
      category: 'proxy' as const,
      message: '代理连接失败',
      details: { 
        proxy: '192.168.1.100:8080', 
        error: 'Connection timeout',
        responseTime: 5000
      }
    },
    {
      level: 'warn' as const,
      category: 'system' as const,
      message: '内存使用率过高',
      details: { 
        memoryUsage: '85%',
        threshold: '80%',
        availableMemory: '512MB'
      }
    },
    {
      level: 'debug' as const,
      category: 'api' as const,
      message: 'API请求详细信息',
      details: { 
        url: 'https://api.example.com/posts', 
        method: 'POST', 
        status: 201,
        requestHeaders: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token...'
        },
        requestBody: { title: 'Test Post', content: 'Sample content' }
      }
    },
    {
      level: 'info' as const,
      category: 'proxy' as const,
      message: '代理测试通过',
      details: { 
        proxy: '192.168.1.101:8080', 
        testUrl: 'https://httpbin.org/ip',
        responseTime: 320,
        success: true
      }
    },
    {
      level: 'error' as const,
      category: 'api' as const,
      message: 'API请求失败 - 认证错误',
      details: { 
        url: 'https://api.example.com/admin/users', 
        method: 'GET', 
        status: 401,
        error: 'Unauthorized',
        requestId: 'req_789012'
      }
    },
    {
      level: 'info' as const,
      category: 'system' as const,
      message: '应用启动完成',
      details: { 
        startupTime: 2345,
        version: '0.1.0',
        environment: 'development',
        features: ['api-testing', 'proxy-pool', 'logs']
      }
    },
    {
      level: 'warn' as const,
      category: 'proxy' as const,
      message: '代理池中部分代理不可用',
      details: { 
        totalProxies: 10,
        availableProxies: 6,
        failedProxies: ['192.168.1.102:8080', '192.168.1.103:8080', '192.168.1.104:8080', '192.168.1.105:8080']
      }
    }
  ];

  // 添加示例日志
  for (const log of sampleLogs) {
    await logManager.addLog(log);
    // 稍微延迟一下，让时间戳有差异
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('示例日志数据已添加');
}

// 如果直接运行此文件，初始化示例数据
if (require.main === module) {
  initializeSampleLogs().catch(console.error);
}
