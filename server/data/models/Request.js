const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 请求头模式
const headerSchema = new Schema({
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
  }
});

// 请求参数模式
const paramSchema = new Schema({
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
  }
});

// 请求测试模式
const testSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  script: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

// 请求体模式
const bodySchema = new Schema({
  mode: {
    type: String,
    enum: ['raw', 'form-data', 'urlencoded', 'binary', 'none'],
    default: 'none'
  },
  raw: {
    type: String,
    default: ''
  },
  contentType: {
    type: String,
    default: 'application/json'
  },
  formData: [paramSchema],
  urlencoded: [paramSchema],
  binary: {
    type: String
  }
});

// API请求模式
const requestSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    default: 'GET'
  },
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiCollection',
    required: true
  },
  folderId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  headers: [headerSchema],
  params: [paramSchema],
  body: {
    type: bodySchema,
    default: () => ({})
  },
  preRequestScript: {
    type: String,
    default: ''
  },
  tests: [testSchema],
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 为集合ID和文件夹ID创建索引以加快查询
requestSchema.index({ collectionId: 1, folderId: 1 });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
