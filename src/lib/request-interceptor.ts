/**
 * 请求拦截器
 * 根据高级设置配置来拦截和修改网络请求
 */

import { 
  getGlobalProxyConfig, 
  getGlobalSecurityConfig, 
  shouldBypassProxy, 
  isTrustedDomain,
  incrementRequestCount,
  incrementErrorCount,
  setActiveConnections
} from './advanced-settings';

// 跟踪活跃连接
let activeConnections = 0;

/**
 * 原始fetch函数的引用
 */
const originalFetch = window.fetch;

/**
 * 增强的fetch函数
 */
async function enhancedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  
  try {
    // 增加活跃连接数
    activeConnections++;
    setActiveConnections(activeConnections);
    
    // 获取配置
    const proxyConfig = getGlobalProxyConfig();
    const securityConfig = getGlobalSecurityConfig();
    
    // 创建增强的请求配置
    const enhancedInit: RequestInit = { ...init };
    
    // 应用安全设置
    if (securityConfig) {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // 检查是否为信任域名
      const isTrusted = isTrustedDomain(hostname);
      
      // 如果不是HTTPS且启用了HSTS，强制升级到HTTPS
      if (securityConfig.enableHSTS && urlObj.protocol === 'http:' && !isTrusted) {
        urlObj.protocol = 'https:';
      }
      
      // 设置安全头
      const headers = new Headers(enhancedInit.headers);
      
      if (securityConfig.enableRequestSigning) {
        // 添加请求签名头（简化版本）
        const timestamp = Date.now().toString();
        const signature = btoa(`abyss-${timestamp}-${url}`);
        headers.set('X-Abyss-Signature', signature);
        headers.set('X-Abyss-Timestamp', timestamp);
      }
      
      enhancedInit.headers = headers;
    }
    
    // 应用代理设置
    if (proxyConfig.enabled && !shouldBypassProxy(url)) {
      // 注意：浏览器环境中无法直接设置代理
      // 这里只是记录配置，实际代理需要通过服务端实现
      console.log('Proxy would be used:', proxyConfig);
    }
    
    // 增加请求计数
    incrementRequestCount();
    
    // 发送请求
    const response = await originalFetch(url, enhancedInit);
    
    // 检查响应状态
    if (!response.ok) {
      incrementErrorCount();
    }
    
    return response;
    
  } catch (error) {
    // 增加错误计数
    incrementErrorCount();
    throw error;
  } finally {
    // 减少活跃连接数
    activeConnections--;
    setActiveConnections(activeConnections);
  }
}

/**
 * 安装请求拦截器
 */
export function installRequestInterceptor(): void {
  if (typeof window !== 'undefined' && window.fetch) {
    // 替换全局fetch函数
    window.fetch = enhancedFetch;
    
    console.log('Abyss request interceptor installed');
  }
}

/**
 * 卸载请求拦截器
 */
export function uninstallRequestInterceptor(): void {
  if (typeof window !== 'undefined' && originalFetch) {
    // 恢复原始fetch函数
    window.fetch = originalFetch;
    
    console.log('Abyss request interceptor uninstalled');
  }
}

/**
 * 创建支持代理的fetch函数
 */
export async function proxyFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const proxyConfig = getGlobalProxyConfig();
  
  if (!proxyConfig.enabled || shouldBypassProxy(url)) {
    return fetch(url, options);
  }
  
  // 通过代理服务发送请求
  try {
    const proxyResponse = await fetch('/api/v1/proxies/send-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          protocol: proxyConfig.type,
          username: proxyConfig.username,
          password: proxyConfig.password,
        },
      }),
    });
    
    if (!proxyResponse.ok) {
      throw new Error(`Proxy request failed: ${proxyResponse.status}`);
    }
    
    const result = await proxyResponse.json();
    
    // 创建一个模拟的Response对象
    return new Response(result.data, {
      status: result.status || 200,
      statusText: result.statusText || 'OK',
      headers: result.headers || {},
    });
    
  } catch (error) {
    console.error('Proxy request failed:', error);
    // 降级到直接请求
    return fetch(url, options);
  }
}

/**
 * 应用SSL/TLS设置到请求
 */
export function applySecuritySettings(url: string, init: RequestInit = {}): RequestInit {
  const securityConfig = getGlobalSecurityConfig();
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  const enhancedInit = { ...init };
  const headers = new Headers(enhancedInit.headers);
  
  // 检查是否为信任域名
  const isTrusted = isTrustedDomain(hostname);
  
  // 如果启用SSL验证且不是信任域名
  if (securityConfig.enableSSLVerification && !isTrusted) {
    // 在浏览器环境中，SSL验证由浏览器自动处理
    // 这里主要是记录配置
    console.log('SSL verification enabled for:', hostname);
  }
  
  // 如果允许自签名证书且是信任域名
  if (securityConfig.allowSelfSignedCerts && isTrusted) {
    console.log('Self-signed certificates allowed for:', hostname);
  }
  
  // 添加安全头
  if (securityConfig.enableHSTS && urlObj.protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  enhancedInit.headers = headers;
  return enhancedInit;
}

/**
 * 监听设置更新事件
 */
if (typeof window !== 'undefined') {
  window.addEventListener('abyss-settings-updated', (event: any) => {
    console.log('Advanced settings updated:', event.detail);
    
    // 可以在这里重新应用设置到全局配置
    const { proxy, security, performance } = event.detail;
    
    // 更新全局配置
    if (proxy) {
      (window as any).__abyssProxyConfig__ = proxy.enableGlobalProxy ? {
        enabled: true,
        host: proxy.proxyHost,
        port: proxy.proxyPort,
        type: proxy.proxyType,
        username: proxy.proxyUsername,
        password: proxy.proxyPassword,
        bypassList: proxy.bypassList,
      } : { enabled: false };
    }
    
    if (security) {
      (window as any).__abyssSecurityConfig__ = security;
    }
    
    if (performance) {
      (window as any).__abyssConnectionConfig__ = {
        maxConcurrent: performance.maxConcurrentConnections,
        poolSize: performance.connectionPoolSize,
      };
      
      (window as any).__abyssCacheConfig__ = {
        enabled: performance.enableRequestCaching,
        maxSize: performance.cacheSize * 1024 * 1024,
        compression: performance.enableResponseCompression,
      };
      
      (window as any).__abyssMemoryLimit__ = performance.maxMemoryUsage * 1024 * 1024;
    }
  });
}

// 自动安装拦截器
if (typeof window !== 'undefined') {
  // 在页面加载完成后安装
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installRequestInterceptor);
  } else {
    installRequestInterceptor();
  }
}
