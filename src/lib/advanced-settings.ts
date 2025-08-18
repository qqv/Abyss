/**
 * 高级设置管理工具
 * 用于在整个应用中访问和应用高级设置
 */

export interface ProxySettings {
  enableGlobalProxy: boolean;
  proxyHost: string;
  proxyPort: number;
  proxyUsername: string;
  proxyPassword: string;
  proxyType: 'http' | 'https' | 'socks4' | 'socks5';
  bypassList: string[];
}

export interface SecuritySettings {
  enableSSLVerification: boolean;
  allowSelfSignedCerts: boolean;
  enableCertificatePinning: boolean;
  trustedCertificates: string[];
  enableRequestSigning: boolean;
  trustedDomains: string[];
  enableHSTS: boolean;
  minimumTLSVersion: '1.0' | '1.1' | '1.2' | '1.3';
}

export interface PerformanceSettings {
  maxMemoryUsage: number; // MB
  enableRequestCaching: boolean;
  cacheSize: number; // MB
  enableResponseCompression: boolean;
  maxConcurrentConnections: number;
  connectionPoolSize: number;
}

export interface PerformanceStats {
  memoryUsage: number;
  cacheUsage: number;
  activeConnections: number;
  requestCount: number;
  errorCount: number;
  lastUpdated: Date;
}

/**
 * 获取代理设置
 */
export function getProxySettings(): ProxySettings {
  try {
    const saved = localStorage.getItem('abyss-proxy-settings');
    if (saved) {
      return { ...getDefaultProxySettings(), ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load proxy settings:', error);
  }
  return getDefaultProxySettings();
}

/**
 * 获取安全设置
 */
export function getSecuritySettings(): SecuritySettings {
  try {
    const saved = localStorage.getItem('abyss-security-settings');
    if (saved) {
      return { ...getDefaultSecuritySettings(), ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load security settings:', error);
  }
  return getDefaultSecuritySettings();
}

/**
 * 获取性能设置
 */
export function getPerformanceSettings(): PerformanceSettings {
  try {
    const saved = localStorage.getItem('abyss-performance-settings');
    if (saved) {
      return { ...getDefaultPerformanceSettings(), ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load performance settings:', error);
  }
  return getDefaultPerformanceSettings();
}

/**
 * 获取全局代理配置
 */
export function getGlobalProxyConfig() {
  return (window as any).__abyssProxyConfig__ || { enabled: false };
}

/**
 * 获取全局安全配置
 */
export function getGlobalSecurityConfig() {
  return (window as any).__abyssSecurityConfig__ || getDefaultSecuritySettings();
}

/**
 * 获取全局性能配置
 */
export function getGlobalPerformanceConfig() {
  return (window as any).__abyssConnectionConfig__ || {};
}

/**
 * 检查URL是否应该绕过代理
 */
export function shouldBypassProxy(url: string): boolean {
  const proxyConfig = getGlobalProxyConfig();
  if (!proxyConfig.enabled || !proxyConfig.bypassList) {
    return false;
  }

  const hostname = new URL(url).hostname;
  
  return proxyConfig.bypassList.some((pattern: string) => {
    // 支持通配符匹配
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
    );
    return regex.test(hostname);
  });
}

/**
 * 检查域名是否在信任列表中
 */
export function isTrustedDomain(hostname: string): boolean {
  const securityConfig = getGlobalSecurityConfig();
  if (!securityConfig.trustedDomains) {
    return false;
  }

  return securityConfig.trustedDomains.some((pattern: string) => {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
    );
    return regex.test(hostname);
  });
}

/**
 * 获取当前性能统计数据
 */
export async function getPerformanceStats(): Promise<PerformanceStats> {
  try {
    // 获取内存信息
    const memoryInfo = (performance as any).memory || {};
    const usedJSHeapSize = memoryInfo.usedJSHeapSize || 0;
    
    // 计算缓存使用量
    let cacheSize = 0;
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        cacheSize += localStorage.getItem(key)?.length || 0;
      }
    } catch (e) {
      // 忽略错误
    }
    
    // 获取活跃连接数
    const activeConnections = (window as any).__activeConnections__ || 0;
    
    // 获取请求统计
    const requestCount = parseInt(localStorage.getItem('abyss-request-count') || '0');
    const errorCount = parseInt(localStorage.getItem('abyss-error-count') || '0');
    
    return {
      memoryUsage: Math.round(usedJSHeapSize / 1024 / 1024), // MB
      cacheUsage: Math.round(cacheSize / 1024 / 1024), // MB
      activeConnections,
      requestCount,
      errorCount,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Failed to get performance stats:', error);
    return {
      memoryUsage: 0,
      cacheUsage: 0,
      activeConnections: 0,
      requestCount: 0,
      errorCount: 0,
      lastUpdated: new Date(),
    };
  }
}

/**
 * 增加请求计数
 */
export function incrementRequestCount() {
  try {
    const current = parseInt(localStorage.getItem('abyss-request-count') || '0');
    localStorage.setItem('abyss-request-count', (current + 1).toString());
  } catch (error) {
    console.error('Failed to increment request count:', error);
  }
}

/**
 * 增加错误计数
 */
export function incrementErrorCount() {
  try {
    const current = parseInt(localStorage.getItem('abyss-error-count') || '0');
    localStorage.setItem('abyss-error-count', (current + 1).toString());
  } catch (error) {
    console.error('Failed to increment error count:', error);
  }
}

/**
 * 设置活跃连接数
 */
export function setActiveConnections(count: number) {
  (window as any).__activeConnections__ = count;
}

/**
 * 清理应用缓存
 */
export async function clearApplicationCache(): Promise<void> {
  try {
    // 清理应用缓存
    const cacheKeys = [
      'abyss-request-cache',
      'abyss-response-cache',
      'abyss-api-cache',
      'abyss-collection-cache',
    ];
    
    for (const key of cacheKeys) {
      localStorage.removeItem(key);
    }
    
    // 清理浏览器缓存（如果支持）
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}

/**
 * 执行内存优化
 */
export function optimizeMemory(): void {
  try {
    // 触发垃圾回收（如果浏览器支持）
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
    
    // 清理未使用的对象引用
    if ((window as any).__abyssCleanup__) {
      (window as any).__abyssCleanup__();
    }
  } catch (error) {
    console.error('Failed to optimize memory:', error);
    throw error;
  }
}

// 默认设置
function getDefaultProxySettings(): ProxySettings {
  return {
    enableGlobalProxy: false,
    proxyHost: '',
    proxyPort: 8080,
    proxyUsername: '',
    proxyPassword: '',
    proxyType: 'http',
    bypassList: ['localhost', '127.0.0.1', '*.local']
  };
}

function getDefaultSecuritySettings(): SecuritySettings {
  return {
    enableSSLVerification: true,
    allowSelfSignedCerts: false,
    enableCertificatePinning: false,
    trustedCertificates: [],
    enableRequestSigning: false,
    trustedDomains: ['localhost', '127.0.0.1', '*.local'],
    enableHSTS: true,
    minimumTLSVersion: '1.2'
  };
}

function getDefaultPerformanceSettings(): PerformanceSettings {
  return {
    maxMemoryUsage: 512,
    enableRequestCaching: true,
    cacheSize: 100,
    enableResponseCompression: true,
    maxConcurrentConnections: 50,
    connectionPoolSize: 10
  };
}
