import mongoose, { Schema } from 'mongoose';

// 环境变量接口
export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  type: 'text' | 'secret';
}

// 环境接口
export interface IEnvironment {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  isPublic: boolean;
  variables: EnvironmentVariable[];
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 环境变量Schema
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

// 环境Schema
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

export const Environment = mongoose.models.Environment || mongoose.model<IEnvironment>('Environment', environmentSchema); 