const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 全局变量模式
const globalVariableSchema = new Schema({
  key: {
    type: String,
    required: true
  },
  value: {
    type: String,
    default: ''
  },
  description: {
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
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// 为键和所有者创建唯一索引
globalVariableSchema.index({ key: 1, owner: 1 }, { unique: true });

const GlobalVariable = mongoose.model('GlobalVariable', globalVariableSchema);

module.exports = GlobalVariable;
