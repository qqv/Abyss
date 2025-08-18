const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// API变量模式
const variableSchema = new Schema({
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
  }
});

// API集合模式
const apiCollectionSchema = new Schema({
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
  variables: [variableSchema]
}, {
  timestamps: true
});

// 为名称和所有者创建唯一索引
apiCollectionSchema.index({ name: 1, owner: 1 }, { unique: true });

const ApiCollection = mongoose.model('ApiCollection', apiCollectionSchema);

module.exports = ApiCollection;
