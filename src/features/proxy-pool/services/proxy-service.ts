/**
 * 代理池面板的服务函数
 * 负责与API交互获取数据
 */
import { Proxy, ProxyPoolConfig, ProxyStats } from '../types';

// 获取所有代理
export async function fetchProxies(): Promise<Proxy[]> {
  try {
    const response = await fetch('/api/v1/proxies', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取代理列表失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 转换API返回的数据为UI组件需要的格式
    return data.map((proxy: any) => {
      // 创建符合Proxy接口的对象
      const proxyObj: Proxy = {
        id: proxy._id,
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol as any, // 强制类型转换
        username: proxy.username,
        password: proxy.password,
        isActive: proxy.isActive,
        isValid: proxy.isValid,
        lastChecked: proxy.lastChecked ? new Date(proxy.lastChecked) : undefined,
        failureCount: proxy.failureCount || 0,
        responseTime: proxy.responseTime // 添加延时字段映射
      };
      
      return proxyObj;
    });
  } catch (error) {
    console.error('获取代理列表失败:', error);
    return [];
  }
}

// 获取代理池配置
export async function fetchProxyConfig(): Promise<ProxyPoolConfig> {
  try {
    const response = await fetch('/api/v1/proxy-config', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取代理池配置失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 创建符合ProxyPoolConfig接口的对象
    const configObj: ProxyPoolConfig = {
      // 代理验证设置
      checkProxiesOnStartup: data.checkProxiesOnStartup ?? true,
      enableHealthCheck: data.enableHealthCheck ?? false,
      proxyHealthCheckInterval: data.proxyHealthCheckInterval ?? 60,
      maxFailuresBeforeRemoval: data.maxFailuresBeforeRemoval ?? 5,
      
      // 性能设置
      connectionTimeout: data.connectionTimeout ?? 5000,
      requestTimeout: data.requestTimeout ?? 10000,
      maxConcurrentChecks: data.maxConcurrentChecks ?? 10,
      
      // 重试设置
      maxRetries: data.maxRetries ?? 2,
      retryDelay: data.retryDelay ?? 1000,
      enableConnectionRetry: data.enableConnectionRetry ?? true,
      
      // 自动管理设置
      autoRemoveInvalidProxies: data.autoRemoveInvalidProxies ?? false,
      retryFailedProxies: data.retryFailedProxies ?? true,
      
      // 日志和监控
      enableDetailedLogging: data.enableDetailedLogging ?? false,
      keepStatisticsHistory: data.keepStatisticsHistory ?? true,
    };
    
    return configObj;
  } catch (error) {
    console.error('获取代理池配置失败:', error);
    // 返回默认配置
    return {
      // 代理验证设置
      checkProxiesOnStartup: true,
      enableHealthCheck: false,
      proxyHealthCheckInterval: 60,
      maxFailuresBeforeRemoval: 5,
      
      // 性能设置
      connectionTimeout: 5000,
      requestTimeout: 10000,
      maxConcurrentChecks: 10,
      
      // 重试设置
      maxRetries: 2,
      retryDelay: 1000,
      enableConnectionRetry: true,
      
      // 自动管理设置
      autoRemoveInvalidProxies: false,
      retryFailedProxies: true,
      
      // 日志和监控
      enableDetailedLogging: false,
      keepStatisticsHistory: true,
    };
  }
}

// 获取代理池统计数据
export async function fetchProxyStats(): Promise<ProxyStats> {
  try {
    const response = await fetch('/api/v1/proxies/stats', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const proxies = await fetchProxies();
      // 如果API还没实现，从代理列表计算
      const validProxies = proxies.filter(p => p.isValid === true);
      // 由于正式数据存储在数据库中，已解决了responseTime问题
      // 这里我们使用一个默认值
      const avgResponseTime = 0;
      
      return {
        totalProxies: proxies.length,
        activeProxies: proxies.filter(p => p.isActive).length,
        validProxies: validProxies.length,
        averageResponseTime: Math.round(avgResponseTime)
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取代理池统计失败:', error);
    return {
      totalProxies: 0,
      activeProxies: 0,
      validProxies: 0,
      averageResponseTime: 0
    };
  }
}

// 添加新代理
export async function addProxy(proxy: Omit<Proxy, "id" | "isActive" | "lastChecked" | "isValid">): Promise<Proxy | null> {
  try {
    const response = await fetch('/api/v1/proxies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol,
        username: proxy.username,
        password: proxy.password
      })
    });
    
    if (!response.ok) {
      throw new Error(`添加代理失败: ${response.status}`);
    }
    
    const newProxy = await response.json();
    
    // 创建符合Proxy接口的对象
    const proxyObj: Proxy = {
      id: newProxy._id,
      host: newProxy.host,
      port: newProxy.port,
      protocol: newProxy.protocol as any, // 强制类型转换
      username: newProxy.username,
      password: newProxy.password,
      isActive: newProxy.isActive,
      isValid: newProxy.isValid,
      lastChecked: newProxy.lastChecked ? new Date(newProxy.lastChecked) : undefined,
      failureCount: newProxy.failureCount || 0
    };
    
    return proxyObj;
  } catch (error) {
    console.error('添加代理失败:', error);
    return null;
  }
}

// 删除代理
export async function deleteProxy(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/proxies/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`删除代理失败: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`删除代理失败 (ID: ${id}):`, error);
    return false;
  }
}

// 切换代理激活状态
export async function toggleProxyActive(id: string, isActive: boolean): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/proxies/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive })
    });
    
    if (!response.ok) {
      throw new Error(`更新代理状态失败: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`更新代理状态失败 (ID: ${id}):`, error);
    return false;
  }
}

// 测试所有代理
export async function testAllProxies(): Promise<{success: boolean, proxiesCount?: number}> {
  try {
    const response = await fetch('/api/v1/proxies/test-all', {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`测试代理失败: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      proxiesCount: data.proxiesCount || 0
    };
  } catch (error) {
    console.error('测试所有代理失败:', error);
    return { success: false };
  }
}

// 获取代理测试状态
export async function getTestStatus(): Promise<{inProgress: boolean, completed: number, total: number}> {
  try {
    const response = await fetch('/api/v1/proxies/test-status', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取测试状态失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取测试状态失败:', error);
    return { inProgress: false, completed: 0, total: 0 };
  }
}

// 批量添加代理
export async function bulkAddProxies(proxiesText: string, defaultProtocol: string = 'http'): Promise<{success: number, failed: number}> {
  try {
    // 将文本格式的代理转换为对象数组
    const proxiesArray = parseProxiesText(proxiesText, defaultProtocol);
    
    if (proxiesArray.length === 0) {
      throw new Error('没有有效的代理格式');
    }
    
    const response = await fetch('/api/v1/proxies/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ proxies: proxiesArray })
    });
    
    if (!response.ok) {
      throw new Error(`批量导入代理失败: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      success: result.success || 0,
      failed: result.failed || 0
    };
  } catch (error) {
    console.error('批量导入代理失败:', error);
    throw error;
  }
}

// 自动移除无效代理
export async function removeInvalidProxies(maxFailures: number): Promise<{removed: number, remaining: number}> {
  try {
    const response = await fetch('/api/v1/proxies/remove-invalid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ maxFailures })
    });
    
    if (!response.ok) {
      throw new Error(`移除无效代理失败: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      removed: result.removed || 0,
      remaining: result.remaining || 0
    };
  } catch (error) {
    console.error('自动移除无效代理失败:', error);
    throw error;
  }
}

// 将文本格式的代理解析为对象数组
function parseProxiesText(text: string, defaultProtocol: string = 'http'): Array<{host: string, port: string|number, protocol: string, username?: string, password?: string}> {
  // 确保默认协议小写
  const normalizedDefaultProtocol = defaultProtocol.toLowerCase();
  
  const lines = text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  
  const proxies = lines.map(line => {
    // 处理各种代理格式
    
    // 格式1：IP:PORT
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(line)) {
      const [host, port] = line.split(':');
      return { host, port: parseInt(port), protocol: normalizedDefaultProtocol }; // 使用传入的默认协议
    }
    
    // 格式2：以协议开头的URL，如 http://host:port, socks4://host:port, socks5://host:port
    const urlMatch = /^(https?|socks[45]):\/\/(?:([^:@]+):([^@]+)@)?([^:\/]+):(\d+)$/i.exec(line);
    if (urlMatch) {
      const protocol = urlMatch[1].toLowerCase();
      const username = urlMatch[2];
      const password = urlMatch[3];
      const host = urlMatch[4];
      const port = parseInt(urlMatch[5]);
      
      const result: any = {
        host,
        port,
        protocol
      };
      
      if (username && password) {
        result.username = username;
        result.password = password;
      }
      
      return result;
    }
    
    // 格式3：host:port:protocol（可能还有用户名和密码）
    const parts = line.split(':');
    if (parts.length >= 3) {
      const [host, port, protocol] = parts;
      
      // 检查第三部分是否为已知协议
      const commonProtocols = ['http', 'https', 'socks4', 'socks5'];
      if (commonProtocols.includes(protocol.toLowerCase())) {
        const proxy: any = { host, port: parseInt(port), protocol: protocol.toLowerCase() };
        
        // 如果还有用户名和密码
        if (parts.length >= 5) {
          proxy.username = parts[3];
          proxy.password = parts[4];
        }
        
        return proxy;
      } else {
        // 新增：格式为 IP:PORT:COUNTRY，忽略国家部分
        return { host, port: parseInt(port), protocol: normalizedDefaultProtocol };
      }
    }
    
    // 格式4：用空格分隔的 IP PORT
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}[\s\t]+\d+$/.test(line)) {
      const [host, port] = line.split(/\s+/);
      return { host, port: parseInt(port), protocol: normalizedDefaultProtocol }; // 使用传入的默认协议
    }
    
    // 格式5：任何其他可能的host:port格式（非完全符合IPv4格式的主机名）
    if (/^[^:]+:\d+$/.test(line)) {
      const [host, port] = line.split(':');
      return { host, port: parseInt(port), protocol: normalizedDefaultProtocol }; // 使用传入的默认协议
    }
    
    // 如果无法识别格式，返回null
    return null;
  }).filter(proxy => proxy !== null); // 过滤掉无法解析的代理
  
  return proxies;
}

// 更新代理池配置
export async function updateProxyConfig(config: Partial<ProxyPoolConfig>): Promise<ProxyPoolConfig | null> {
  try {
    const response = await fetch('/api/v1/proxy-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`更新代理池配置失败: ${response.status}`);
    }
    
    const updatedConfig = await response.json();
    
    // 创建符合ProxyPoolConfig接口的对象
    const configObj: ProxyPoolConfig = {
      // 代理验证设置
      checkProxiesOnStartup: updatedConfig.checkProxiesOnStartup ?? true,
      enableHealthCheck: updatedConfig.enableHealthCheck ?? false,
      proxyHealthCheckInterval: updatedConfig.proxyHealthCheckInterval ?? 60,
      maxFailuresBeforeRemoval: updatedConfig.maxFailuresBeforeRemoval ?? 5,
      
      // 性能设置
      connectionTimeout: updatedConfig.connectionTimeout ?? 5000,
      requestTimeout: updatedConfig.requestTimeout ?? 10000,
      maxConcurrentChecks: updatedConfig.maxConcurrentChecks ?? 10,
      
      // 重试设置
      maxRetries: updatedConfig.maxRetries ?? 2,
      retryDelay: updatedConfig.retryDelay ?? 1000,
      enableConnectionRetry: updatedConfig.enableConnectionRetry ?? true,
      
      // 自动管理设置
      autoRemoveInvalidProxies: updatedConfig.autoRemoveInvalidProxies ?? false,
      retryFailedProxies: updatedConfig.retryFailedProxies ?? true,
      
      // 日志和监控
      enableDetailedLogging: updatedConfig.enableDetailedLogging ?? false,
      keepStatisticsHistory: updatedConfig.keepStatisticsHistory ?? true,
    };
    
    return configObj;
  } catch (error) {
    console.error('更新代理池配置失败:', error);
    return null;
  }
}
