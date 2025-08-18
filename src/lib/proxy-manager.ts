/**
 * 代理池管理器服务
 * 负责代理的选择、测试和轮换
 */

import type { NextRequest } from 'next/server';

// 代理接口定义
export interface ProxyData {
  _id: string;
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
  isActive: boolean;
  isValid?: boolean;
  responseTime?: number;
  lastChecked?: string;
  failureCount?: number;
  createdAt: string;
  updatedAt: string;
}

// 代理池配置接口
export interface ProxyPoolConfig {
  _id: string;
  selectionMode: 'random' | 'roundRobin' | 'fastest';
  autoRotationInterval: number; // 秒
  checkProxiesOnStartup: boolean;
  validateOnFailure: boolean;
  maxFailures: number;
  createdAt: string;
  updatedAt: string;
}

// 代理池管理器
export class ProxyPoolManager {
  private static instance: ProxyPoolManager;
  private proxies: ProxyData[] = [];
  private config: ProxyPoolConfig | null = null;
  private lastFetchTime: number = 0;
  private currentProxyIndex: number = 0;
  private autoRotateTimer: NodeJS.Timeout | null = null;
  
  // 单例模式
  public static getInstance(): ProxyPoolManager {
    if (!ProxyPoolManager.instance) {
      ProxyPoolManager.instance = new ProxyPoolManager();
    }
    return ProxyPoolManager.instance;
  }
  
  // 加载代理和配置
  public async initialize(): Promise<void> {
    try {
      await this.fetchProxies();
      await this.fetchConfig();
      
      if (this.config && this.config.autoRotationInterval > 0) {
        this.startAutoRotation();
      }
      
      if (this.config && this.config.checkProxiesOnStartup) {
        this.testAllProxies();
      }
    } catch (error) {
      console.error('初始化代理池失败:', error);
    }
  }
  
  // 获取代理列表
  private async fetchProxies(): Promise<void> {
    try {
      // 使用服务端函数直接从数据库获取数据
      if (typeof window === 'undefined') {
        // 在服务器端运行
        const { getProxies } = await import('./proxy-service');
        this.proxies = await getProxies();
      } else {
        // 在浏览器端运行，使用API
        const response = await fetch('/api/v1/proxies', {
          // 添加缓存控制防止过期数据
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`获取代理失败: ${response.status}`);
        }
        
        this.proxies = await response.json();
      }
      
      this.lastFetchTime = Date.now();
      console.log(`已成功获取 ${this.proxies.length} 个代理`);
    } catch (error) {
      console.error('获取代理列表失败:', error);
      // 将错误转发出去，但不影响代理池继续工作
      // throw error;
    }
  }
  
  // 获取代理池配置
  private async fetchConfig(): Promise<void> {
    try {
      // 使用服务端函数直接从数据库获取配置
      if (typeof window === 'undefined') {
        // 在服务器端运行
        const { getProxyConfig } = await import('./proxy-service');
        this.config = await getProxyConfig();
      } else {
        // 在浏览器端运行，使用API
        const response = await fetch('/api/v1/proxy-config', {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`获取代理池配置失败: ${response.status}`);
        }
        
        this.config = await response.json();
      }
      
      console.log('代理池配置已加载:', this.config);
    } catch (error) {
      console.error('获取代理池配置失败:', error);
      // 使用默认配置代替使其继续工作
      this.config = {
        _id: 'default',
        selectionMode: 'random',
        autoRotationInterval: 300, // 5分钟
        checkProxiesOnStartup: true,
        validateOnFailure: true,
        maxFailures: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.log('使用默认代理池配置');
    }
  }
  
  // 测试所有代理
  public async testAllProxies(): Promise<void> {
    try {
      console.log('开始测试所有代理...');
      
      let result;
      // 使用服务端函数直接测试代理
      if (typeof window === 'undefined') {
        // 在服务器端运行
        const { testAllProxies } = await import('./proxy-service');
        result = await testAllProxies();
        console.log('服务器端直接测试代理完成:', result);
      } else {
        // 在浏览器端运行，使用API
        const response = await fetch('/api/v1/proxies/test-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`测试代理失败: ${response.status}`);
        }
        
        result = await response.json();
        console.log('客户端代理测试已启动:', result);
      }
      
      // 10秒后重新获取代理列表，以便获取测试结果
      console.log('将在10秒后获取测试结果');
      setTimeout(() => {
        this.fetchProxies()
          .then(() => console.log('已更新代理列表与测试结果'))
          .catch(err => console.error('更新代理列表失败:', err));
      }, 10000);
      
      return result;
    } catch (error) {
      console.error('测试所有代理失败:', error);
    }
  }
  
  // 启动自动轮换定时器
  private startAutoRotation(): void {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
    }
    
    // 配置了自动轮换间隔 (毫秒)
    if (this.config && this.config.autoRotationInterval > 0) {
      const intervalMs = this.config.autoRotationInterval * 1000;
      
      this.autoRotateTimer = setInterval(() => {
        this.rotateProxy();
        console.log('代理已自动轮换');
      }, intervalMs);
      
      console.log(`已启动代理自动轮换，间隔${this.config.autoRotationInterval}秒`);
    }
  }
  
  // 停止自动轮换
  public stopAutoRotation(): void {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = null;
      console.log('已停止代理自动轮换');
    }
  }
  
  // 手动轮换到下一个代理
  public rotateProxy(): ProxyData | null {
    if (!this.proxies || this.proxies.length === 0) {
      return null;
    }
    
    // 如果超过5分钟没有刷新代理列表，重新获取
    if (Date.now() - this.lastFetchTime > 5 * 60 * 1000) {
      this.fetchProxies().catch(console.error);
    }
    
    const validProxies = this.proxies.filter(p => p.isActive && p.isValid !== false);
    if (validProxies.length === 0) return null;
    
    // 按照配置的选择模式选择代理
    switch (this.config?.selectionMode) {
      case 'fastest':
        // 选择响应时间最快的代理
        return this.selectFastestProxy();
        
      case 'roundRobin':
        // 轮询选择代理
        return this.selectRoundRobinProxy(validProxies);
        
      case 'random':
      default:
        // 随机选择代理
        return this.selectRandomProxy(validProxies);
    }
  }
  
  // 随机选择代理
  private selectRandomProxy(validProxies: ProxyData[]): ProxyData {
    const index = Math.floor(Math.random() * validProxies.length);
    return validProxies[index];
  }
  
  // 轮询选择代理
  private selectRoundRobinProxy(validProxies: ProxyData[]): ProxyData {
    if (this.currentProxyIndex >= validProxies.length) {
      this.currentProxyIndex = 0;
    }
    
    const proxy = validProxies[this.currentProxyIndex];
    this.currentProxyIndex++;
    
    return proxy;
  }
  
  // 选择响应时间最快的代理
  private selectFastestProxy(): ProxyData | null {
    // 筛选有效且有响应时间记录的代理
    const proxiesWithRt = this.proxies.filter(
      p => p.isActive && p.isValid && p.responseTime != null
    );
    
    if (proxiesWithRt.length === 0) {
      // 没有响应时间记录时，回退到随机选择
      const validProxies = this.proxies.filter(p => p.isActive && p.isValid !== false);
      return this.selectRandomProxy(validProxies);
    }
    
    // 按响应时间排序
    return [...proxiesWithRt].sort((a, b) => 
      (a.responseTime || 9999) - (b.responseTime || 9999)
    )[0];
  }
  
  // 获取当前选中的代理
  public getCurrentProxy(): ProxyData | null {
    // 检查是否有可用代理
    if (!this.proxies || this.proxies.length === 0) {
      console.log('没有可用代理，尝试加载代理列表');
      // 如果没有代理，尝试加载
      this.fetchProxies().catch(console.error);
      return null;
    }
    
    // 获取有效代理
    const validProxies = this.proxies.filter(p => p.isActive && p.isValid !== false);
    if (validProxies.length === 0) {
      console.log('没有有效代理可用');
      return null;
    }
    
    // 根据配置的选择模式选择代理，但不轮换索引
    switch (this.config?.selectionMode) {
      case 'fastest':
        // 选择响应时间最快的代理
        return this.selectFastestProxy();
        
      case 'roundRobin':
        // 使用当前索引但不自动增加
        const index = this.currentProxyIndex % validProxies.length;
        return validProxies[index];
        
      case 'random':
      default:
        // 随机选择代理
        return this.selectRandomProxy(validProxies);
    }
  }
  
  // 为请求应用代理
  public async applyProxyToRequest(req: NextRequest): Promise<Request> {
    const proxy = await this.getCurrentProxy();
    if (!proxy) return req;
    
    // 添加代理头信息
    const headers = new Headers(req.headers);
    headers.set('X-Proxy-Host', proxy.host);
    headers.set('X-Proxy-Port', String(proxy.port));
    headers.set('X-Proxy-Protocol', proxy.protocol);
    
    if (proxy.username) {
      headers.set('X-Proxy-Auth', 'Basic ' + Buffer.from(`${proxy.username}:${proxy.password || ''}`).toString('base64'));
    }
    
    // 创建新请求
    return new Request(req.url, {
      method: req.method,
      headers,
      body: req.body,
      cache: req.cache,
      credentials: req.credentials,
      integrity: req.integrity,
      keepalive: req.keepalive,
      mode: req.mode,
      redirect: req.redirect,
      referrer: req.referrer,
      referrerPolicy: req.referrerPolicy,
      signal: req.signal,
    });
  }
}

// 导出单例实例
export const proxyManager = ProxyPoolManager.getInstance();
