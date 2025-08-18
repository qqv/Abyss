import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

// 获取环境变量，并提供默认值
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/scan_app';
const dbName = process.env.DB_NAME || 'scan_app';

// MongoDB 客户端连接选项
const options: any = {
  retryWrites: true,
  w: 'majority',
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 20,
  minPoolSize: 5
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// 在开发环境中使用全局变量，保持热重载期间的连接
if (process.env.NODE_ENV === 'development') {
  // 在 global 类型中添加 _mongoClientPromise
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }

  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // 在生产环境中为每个实例创建新的连接
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// 为 Mongoose 设置连接
const connectMongoDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return Promise.resolve(); // 已经连接
    }
    
    await mongoose.connect(uri, {
      dbName,
      bufferCommands: true,
      autoIndex: true,
      autoCreate: true,
    });
    console.log('✅ MongoDB 连接成功');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ MongoDB 连接失败', error);
    return Promise.reject(error);
  }
};

// 直接连接获取数据库实例的函数
export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    return { client, db };
  } catch (error) {
    console.error('❌ connectToDatabase 失败', error);
    throw error;
  }
}

export { clientPromise, connectMongoDB };
