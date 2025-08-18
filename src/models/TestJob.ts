import mongoose, { Schema } from 'mongoose';

// 测试结果 - 与ApiResult接口保持一致
const TestResultSchema = new Schema({
  requestId: { type: String, required: true },
  requestName: { type: String }, // 请求名称
  url: { type: String }, // 请求URL
  method: { type: String }, // HTTP方法
  
  // 请求相关字段
  requestHeaders: { type: Map, of: String },
  requestBody: { type: String },
  
  // 响应相关字段
  status: { type: Number, required: true }, // HTTP状态码
  statusText: { type: String },
  responseTime: { type: Number, required: true }, // 毫秒
  responseSize: { type: Number }, // 字节
  responseHeaders: { type: Map, of: String },
  responseBody: { type: String },
  
  error: { type: String },
  isNetworkError: { type: Boolean, default: false },
  
  // 测试结果
  testResults: [{
    name: { type: String },
    passed: { type: Boolean },
    error: { type: String },
    duration: { type: Number } // 测试执行时间（毫秒）
  }],
  allTestsPassed: { type: Boolean }, // 所有测试是否通过
  
  // 运行时参数
  parameterValues: { type: Map, of: String },
  timestamp: { type: String, required: true }, // ISO字符串
  
  // 代理信息
  proxyInfo: {
    tunnelId: { type: String },
    tunnelName: { type: String },
    proxy: {
      host: { type: String },
      port: { type: Number },
      protocol: { type: String }
    }
  }
});

// 测试作业
const TestJobSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  collectionId: { type: String, required: true }, // 改为String类型，因为前端使用字符串ID
  collectionName: { type: String }, // 集合名称
  
  // 运行选项
  options: {
    concurrency: { type: Number, default: 1 },
    useProxy: { type: Boolean, default: false },
    selectedTunnelId: { type: String },
    selectedRequests: [{ type: String }], // 选择的请求ID列表
    variableFiles: [{
      variableName: { type: String },
      values: [{ type: String }]
    }],
    timeoutSeconds: { type: Number, default: 30 },
    maxRetries: { type: Number, default: 1 },
    retryDelayMs: { type: Number, default: 500 },
    retryStatusCodes: [{ type: Number }]
  },
  
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  progress: { type: Number, default: 0 }, // 0-100
  
  // 统计信息
  totalRequests: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number }, // 执行时长（毫秒）
  
  results: [TestResultSchema],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const TestJob = mongoose.models.TestJob || mongoose.model('TestJob', TestJobSchema);
