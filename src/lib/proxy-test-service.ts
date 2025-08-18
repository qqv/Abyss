/**
 * 统一的代理测试服务
 * 提供一致的代理测试功能
 */

// @ts-ignore - 忽略类型问题
const fetch = (...args: any[]) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// @ts-ignore
const { HttpsProxyAgent } = require('https-proxy-agent');
// @ts-ignore
const { SocksProxyAgent } = require('socks-proxy-agent');

export interface ProxyTestConfig {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
}

export interface ProxyTestOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableConnectionRetry?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
  enableDetailedLogging?: boolean;
}

export interface ProxyTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  data?: any;
}

// 测试单个代理
export async function testProxy(proxy: ProxyTestConfig, options: ProxyTestOptions = {}): Promise<ProxyTestResult> {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    enableConnectionRetry = true,
    connectionTimeout = 15000,
    requestTimeout = 8000,
    enableDetailedLogging = false
  } = options;
  
  let lastError;
  
  // 尝试测试（包括重试）
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (enableDetailedLogging) {
        console.log(`开始测试代理 ${proxy.host}:${proxy.port} (${proxy.protocol}) - 第${attempt}次尝试`);
      }
      
      const result = await attemptProxyTest(proxy, { connectionTimeout, requestTimeout });
      
      // 如果成功，直接返回结果
      if (result.success) {
        if (attempt > 1 && enableDetailedLogging) {
          console.log(`代理 ${proxy.host}:${proxy.port} 在第${attempt}次尝试后成功`);
        }
        return result;
      }
      
      // 如果失败但不是超时相关错误，或者禁用了连接重试，不重试
      if (!enableConnectionRetry || !isRetryableError(result.message)) {
        if (enableDetailedLogging) {
          console.log(`代理 ${proxy.host}:${proxy.port} 出现不可重试的错误: ${result.message}`);
        }
        return result;
      }
      
      lastError = result;
      
      if (attempt <= maxRetries) {
        if (enableDetailedLogging) {
          console.log(`代理 ${proxy.host}:${proxy.port} 第${attempt}次尝试失败，将重试: ${result.message}`);
        }
        // 重试前等待配置的延迟时间
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
    } catch (error) {
      lastError = {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        responseTime: -1
      };
      
      if (attempt <= maxRetries && enableConnectionRetry && isRetryableError(lastError.message)) {
        if (enableDetailedLogging) {
          console.log(`代理 ${proxy.host}:${proxy.port} 第${attempt}次尝试异常，将重试: ${lastError.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  // 所有尝试都失败了
  if (enableDetailedLogging) {
    console.log(`代理 ${proxy.host}:${proxy.port} 经过${maxRetries + 1}次尝试后仍然失败`);
  }
  return lastError || {
    success: false,
    message: '所有重试尝试都失败',
    responseTime: -1
  };
}

// 判断错误是否可以重试
function isRetryableError(errorMessage: string): boolean {
  const retryableErrors = [
    '超时',
    'timeout',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'JSON读取超时',
    ' 连接超时',
    'AbortError',
    'connect ETIMEDOUT',
    'connect ECONNREFUSED'
  ];
  
  return retryableErrors.some(error => 
    errorMessage.toLowerCase().includes(error.toLowerCase())
  );
}

// 实际执行代理测试的函数
async function attemptProxyTest(proxy: ProxyTestConfig, options: { connectionTimeout: number, requestTimeout: number }): Promise<ProxyTestResult> {
  try {
    // 测试多个不同的目标URL，提高测试可靠性
    const testUrl = 'https://httpbin.org/ip';
    const backupTestUrl = 'https://api.ipify.org?format=json';
    
    // 使用配置中的超时时间
    const timeout = options.connectionTimeout; // 使用配置的连接超时时间
    const jsonTimeout = options.requestTimeout; // 使用配置的请求超时时间
    
    // 创建适当的代理代理
    let agent;
    let proxyUrl;
    
    if (proxy.protocol === 'socks4' || proxy.protocol === 'socks5') {
      // SOCKS代理
      proxyUrl = `${proxy.protocol}://${proxy.username ? `${proxy.username}:${proxy.password}@` : ''}${proxy.host}:${proxy.port}`;
      agent = new SocksProxyAgent(proxyUrl, {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined
      });
      console.log(`创建 SOCKS 代理代理(已禁用TLS验证): ${proxy.protocol}://${proxy.host}:${proxy.port}`);
    } else {
      // HTTP/HTTPS代理
      proxyUrl = `${proxy.protocol}://${proxy.username ? `${proxy.username}:${proxy.password}@` : ''}${proxy.host}:${proxy.port}`;
      agent = new HttpsProxyAgent(proxyUrl, {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined
      });
      console.log(`创建 HTTP/HTTPS 代理代理(已禁用TLS验证): ${proxy.protocol}://${proxy.host}:${proxy.port}`);
    }
    
    // 尝试主要测试URL
    try {
      const result = await testWithUrl(agent, testUrl, proxy, timeout, jsonTimeout);
      return result;
    } catch (mainError) {
      console.error(`主要测试URL失败，尝试备用URL`, mainError);
      
      // 尝试备用URL
      try {
        const result = await testWithUrl(agent, backupTestUrl, proxy, timeout, jsonTimeout);
        result.message = '代理备用测试成功';
        return result;
      } catch (backupError) {
        console.error(`备用测试也失败，代理 ${proxy.host}:${proxy.port} 无效:`, backupError);
        throw backupError;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`代理 ${proxy.host}:${proxy.port} 测试失败: ${errorMessage}`);
    
    return {
      success: false,
      message: errorMessage,
      responseTime: -1
    };
  }
}

// 使用指定URL测试代理
async function testWithUrl(agent: any, testUrl: string, proxy: ProxyTestConfig, timeout: number, jsonTimeout: number): Promise<ProxyTestResult> {
  const requestStartTime = Date.now();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`代理 ${proxy.host}:${proxy.port} 请求超时(${timeout}ms)`);
    controller.abort();
  }, timeout);
  
  console.log(`尝试访问 ${testUrl} 通过代理 ${proxy.host}:${proxy.port}...`);
  
  let response;
  try {
    response = await fetch(testUrl, {
      // @ts-ignore
      agent,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    // 计算纯网络请求延时（不包括JSON解析时间）
    const networkLatency = Date.now() - requestStartTime;
    
    console.log(`代理 ${proxy.host}:${proxy.port} 成功连接，状态码: ${response.status}, 网络延时: ${networkLatency}ms`);
    
  } finally {
    clearTimeout(timeoutId);
    // 清理agent连接资源
    if (agent && typeof agent.destroy === 'function') {
      try {
        agent.destroy();
        console.log(`代理连接资源已释放: ${proxy.host}:${proxy.port}`);
      } catch (destroyError) {
        console.error(`释放代理连接资源失败: ${proxy.host}:${proxy.port}`, destroyError);
      }
    }
  }
  
  // 检查响应状态
  if (!response.ok) {
    throw new Error(`代理返回错误状态码: ${response.status}`);
  }
  
  // 计算总延时（包括JSON解析）
  const totalStartTime = Date.now();
  
  // JSON解析with超时控制
  let data;
  try {
    const jsonController = new AbortController();
    const jsonTimeoutId = setTimeout(() => {
      console.log(`代理 ${proxy.host}:${proxy.port} JSON读取超时(${jsonTimeout}ms)`);
      jsonController.abort();
    }, jsonTimeout);
    
    try {
      data = await Promise.race([
        response.json(),
        new Promise((_, reject) => {
          jsonController.signal.addEventListener('abort', () => {
            reject(new Error('JSON读取超时'));
          });
        })
      ]);
    } finally {
      clearTimeout(jsonTimeoutId);
    }
  } catch (jsonError) {
    console.error(`代理 ${proxy.host}:${proxy.port} JSON解析失败:`, jsonError);
    throw new Error(`JSON解析失败: ${jsonError instanceof Error ? jsonError.message : '未知错误'}`);
  }
  
  // 计算真实的响应时间（从请求开始到数据完全获取）
  const totalResponseTime = Date.now() - requestStartTime;
  const networkResponseTime = Date.now() - totalStartTime;
  
  console.log(`代理 ${proxy.host}:${proxy.port} 测试成功，总延时: ${totalResponseTime}ms，JSON解析: ${networkResponseTime}ms，返回数据:`, data);
  
  return {
    success: true,
    message: '代理测试成功',
    data,
    responseTime: totalResponseTime // 返回准确的总响应时间
  };
} 