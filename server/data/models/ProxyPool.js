const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const proxyPoolSchema = new Schema({
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
  proxies: [{
    type: Schema.Types.ObjectId,
    ref: 'Proxy'
  }],
  selectionMode: {
    type: String,
    enum: ['sequential', 'random', 'custom'],
    default: 'sequential'
  },
  autoRotationInterval: {
    type: Number,
    default: 0 // 0表示禁用自动轮换
  },
  checkProxiesOnStartup: {
    type: Boolean,
    default: true
  },
  validateOnFailure: {
    type: Boolean,
    default: true
  },
  customSelectionRules: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// 为所有者创建索引以加快查询
proxyPoolSchema.index({ owner: 1 });

const ProxyPool = mongoose.model('ProxyPool', proxyPoolSchema);

module.exports = ProxyPool;
