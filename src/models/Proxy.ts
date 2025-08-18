import mongoose, { Schema } from 'mongoose';

// 代理服务器
const ProxySchema = new Schema({
  host: { type: String, required: true },
  port: { type: Number, required: true },
  protocol: { 
    type: String, 
    required: true, 
    enum: ['http', 'https', 'socks4', 'socks5'],
    default: 'http'
  },
  username: { type: String },
  password: { type: String },
  isActive: { type: Boolean, default: true },
  isValid: { type: Boolean },
  failureCount: { type: Number, default: 0 },
  lastChecked: { type: Date },
  responseTime: { type: Number }, // 毫秒
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 代理池配置
const ProxyPoolConfigSchema = new Schema({
  // 代理验证设置
  checkProxiesOnStartup: { type: Boolean, default: true },
  enableHealthCheck: { type: Boolean, default: false },
  proxyHealthCheckInterval: { type: Number, default: 60 }, // 分钟
  maxFailuresBeforeRemoval: { type: Number, default: 5 },
  
  // 性能设置
  connectionTimeout: { type: Number, default: 5000 }, // 毫秒
  requestTimeout: { type: Number, default: 10000 }, // 毫秒
  maxConcurrentChecks: { type: Number, default: 10 },
  
  // 重试设置
  maxRetries: { type: Number, default: 2 },
  retryDelay: { type: Number, default: 1000 }, // 毫秒
  enableConnectionRetry: { type: Boolean, default: true },
  
  // 自动管理设置
  autoRemoveInvalidProxies: { type: Boolean, default: false },
  retryFailedProxies: { type: Boolean, default: true },
  
  // 日志和监控
  enableDetailedLogging: { type: Boolean, default: false },
  keepStatisticsHistory: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Proxy = mongoose.models.Proxy || mongoose.model('Proxy', ProxySchema);
export const ProxyPoolConfig = mongoose.models.ProxyPoolConfig || mongoose.model('ProxyPoolConfig', ProxyPoolConfigSchema);
