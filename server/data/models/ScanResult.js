const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 漏洞模式
const vulnerabilitySchema = new Schema({
  type: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['high', 'medium', 'low', 'info'],
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  evidence: {
    type: String
  },
  location: {
    type: String
  }
});

// 测试结果模式
const testResultSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  error: {
    type: String
  }
});

// 扫描结果模式
const scanResultSchema = new Schema({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'ScanJob',
    required: true
  },
  requestId: {
    type: Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  status: {
    type: Number // HTTP状态码
  },
  statusText: {
    type: String
  },
  url: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  responseTime: {
    type: Number
  },
  responseSize: {
    type: Number
  },
  responseHeaders: {
    type: Object
  },
  responseBody: {
    type: String
  },
  error: {
    type: String
  },
  vulnerabilities: [vulnerabilitySchema],
  testResults: [testResultSchema],
  parameterValues: {
    type: Object
  },
  proxyId: {
    type: Schema.Types.ObjectId,
    ref: 'Proxy'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建索引以加快查询
scanResultSchema.index({ jobId: 1 });
scanResultSchema.index({ requestId: 1 });
scanResultSchema.index({ 'vulnerabilities.severity': 1 });

const ScanResult = mongoose.model('ScanResult', scanResultSchema);

module.exports = ScanResult;
