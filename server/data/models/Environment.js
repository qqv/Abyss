const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 环境变量模式
const environmentVariableSchema = new Schema({
  key: {
    type: String,
    required: true
  },
  value: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    enum: ['text', 'secret'],
    default: 'text'
  }
});

// 环境模式
const environmentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  variables: [environmentVariableSchema],
  color: {
    type: String,
    default: '#00bcd4' // 默认颜色
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 为名称和所有者创建唯一索引
environmentSchema.index({ name: 1, owner: 1 }, { unique: true });

const Environment = mongoose.model('Environment', environmentSchema);

module.exports = Environment;
