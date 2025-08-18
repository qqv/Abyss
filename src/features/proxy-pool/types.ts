export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

export type ProxySelectionMode = 'sequential' | 'random' | 'custom';

export type TunnelRotationType = 'random' | 'sequential' | 'failover';

export interface Proxy {
  id: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
  isActive: boolean;
  lastChecked?: Date;
  isValid?: boolean;
  failureCount?: number;
  responseTime?: number; // 代理延时（毫秒）
}

export interface ProxyPoolConfig {
  // 代理验证设置
  checkProxiesOnStartup: boolean;
  enableHealthCheck: boolean; // 启用代理健康检查
  proxyHealthCheckInterval: number; // 代理健康检查间隔（分钟）
  maxFailuresBeforeRemoval: number; // 失败多少次后移除代理
  
  // 性能设置
  connectionTimeout: number; // 连接超时时间（毫秒）
  requestTimeout: number; // 请求超时时间（毫秒）
  maxConcurrentChecks: number; // 最大并发检查数
  
  // 重试设置
  maxRetries: number; // 最大重试次数
  retryDelay: number; // 重试延迟时间（毫秒）
  enableConnectionRetry: boolean; // 启用连接重试（针对ETIMEDOUT等错误）
  
  // 自动管理设置
  autoRemoveInvalidProxies: boolean; // 自动移除无效代理
  retryFailedProxies: boolean; // 重试失败的代理
  
  // 日志和监控
  enableDetailedLogging: boolean; // 启用详细日志
  keepStatisticsHistory: boolean; // 保留统计历史
}

export interface ProxyStats {
  totalProxies: number;
  activeProxies: number;
  validProxies: number;
  lastRotation?: Date;
  averageResponseTime?: number; // in ms
}

export interface Tunnel {
  id: string;
  name: string;
  proxyIds: string[]; // References to proxies in the pool
  active: boolean;
  taskId?: string; // Associated task if any
  
  // 隧道配置选项
  rotationType: TunnelRotationType; // 轮换类型：随机、按顺序、故障转移
  rotationInterval: number; // 轮换间隔（秒），0表示不自动轮换
  maxRotations: number; // 最大轮换次数，0表示无限制
  validityDuration: number; // 有效时间（小时），0表示永久有效
  maxConcurrentRequests: number; // 最大并发请求数
  retryCount: number; // 失败重试次数
  
  // 统计信息
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  totalRequests: number;
  successfulRequests: number;
  currentProxyIndex: number; // 当前使用的代理索引（用于顺序轮换）
  rotationCount: number; // 已轮换次数
}
