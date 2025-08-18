// scripts/init-mongo.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/scan_app';
const dbName = process.env.DB_NAME || 'scan_app';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // 集合列表，参考 src/models 目录下的模型
    const collections = [
      'collections', // 对应 Collection.ts
      'environments', // 对应 Environment.ts
      'testjobs',     // 对应 TestJob.ts
      'proxies',      // 对应 Proxy.ts
      'proxypoolconfigs' // ProxyPoolConfig 可能作为单独集合
    ];

    // 创建集合（如果不存在）
    for (const name of collections) {
      const exists = (await db.listCollections({ name }).toArray()).length > 0;
      if (!exists) {
        await db.createCollection(name);
        console.log(`✅ 已创建集合: ${name}`);
      } else {
        console.log(`ℹ️ 已存在集合: ${name}`);
      }
    }

    console.log('✅ MongoDB 所有集合已初始化/存在');
  } catch (err) {
    console.error('❌ 初始化失败：', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
