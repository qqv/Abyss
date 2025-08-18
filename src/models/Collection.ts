import mongoose, { Schema } from 'mongoose';

// 请求方法枚举
export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

// 请求头部
const HeaderSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true, default: '' },
  enabled: { type: Boolean, default: true },
});

// 查询参数
const QueryParamSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true, default: '' },
  enabled: { type: Boolean, default: true },
});

// 请求体参数
const BodyParamSchema = new Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['raw', 'formData', 'urlencoded', 'binary', 'graphql'] 
  },
  contentType: { type: String, default: 'application/json' },
  content: { type: String, default: '' },
  formData: [HeaderSchema], // 复用HeaderSchema结构
  urlencoded: [HeaderSchema],
  // 适配Postman结构
  mode: { type: String, enum: ['raw', 'form-data', 'urlencoded', 'binary', 'none'] },
  raw: { type: String }
});

// 验证步骤
const AssertionSchema = new Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['statusCode', 'responseTime', 'header', 'body', 'jsonPath', 'script'] 
  },
  target: { type: String, default: '' },
  operation: { 
    type: String, 
    default: 'equals',
    enum: ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'exists', 'notExists', 'script']
  },
  value: { type: Schema.Types.Mixed },
  enabled: { type: Boolean, default: true },
});

// 认证信息结构
const AuthSchema = new Schema({
  type: { 
    type: String, 
    default: 'none',
    enum: ['none', 'basic', 'apikey', 'bearer', 'oauth2']
  },
  enabled: { type: Boolean, default: true },
  // Basic Auth
  username: { type: String },
  password: { type: String },
  // API Key
  apiKey: { type: String },
  apiKeyName: { type: String },
  apiKeyIn: { type: String, enum: ['header', 'query'] },
  // Bearer
  token: { type: String },
  // OAuth2
  clientId: { type: String },
  clientSecret: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  tokenUrl: { type: String },
  authUrl: { type: String },
  scope: { type: String },
});

// API请求
const RequestSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  method: { 
    type: String, 
    required: true, 
    enum: Object.values(RequestMethod),
    default: RequestMethod.GET
  },
  url: { type: String, required: true },
  description: { type: String, default: '' },
  headers: [HeaderSchema],
  queryParams: [QueryParamSchema],
  body: { type: BodyParamSchema },
  assertions: [AssertionSchema],
  // 添加认证信息支持
  auth: { type: AuthSchema },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 文件夹
const FolderSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  folders: { type: [Schema.Types.Mixed], default: [] }, // 自引用结构
  requests: { type: [RequestSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// API 集合
const CollectionSchema = new Schema({
  // 不显式定义_id字段，让MongoDB自动生成ObjectId
  name: { type: String, required: true },
  description: { type: String, default: '' },
  folders: { type: [FolderSchema], default: [] },
  requests: { type: [RequestSchema], default: [] },
  // 添加自定义id字段来兼容前端
  id: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Collection = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema);
