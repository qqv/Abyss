const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scanJobSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiCollection',
    required: true
  },
  requests: [{
    type: Schema.Types.ObjectId,
    ref: 'Request'
  }], // 空数组表示扫描集合中的所有请求
  parameterSetId: {
    type: Schema.Types.ObjectId,
    ref: 'ParameterSet'
  },
  proxyPoolId: {
    type: Schema.Types.ObjectId,
    ref: 'ProxyPool'
  },
  tunnelId: {
    type: Schema.Types.ObjectId,
    ref: 'Tunnel'
  },
  concurrency: {
    type: Number,
    default: 5,
    min: 1,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  }
}, {
  timestamps: true
});

// 创建索引以加快查询
scanJobSchema.index({ owner: 1, status: 1 });
scanJobSchema.index({ collectionId: 1 });

const ScanJob = mongoose.model('ScanJob', scanJobSchema);

module.exports = ScanJob;
