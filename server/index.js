const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 初始化Express应用
const app = express();

// 中间件
app.use(helmet()); // 安全头
app.use(cors()); // 跨域支持
app.use(express.json()); // 解析JSON请求体
app.use(morgan('dev')); // 请求日志

// 连接MongoDB数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/api-scanner')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
  })
  .catch(err => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// API路由
app.use('/api/v1/auth', require('./routes/api/v1/auth'));
app.use('/api/v1/collections', require('./routes/api/v1/collections'));
app.use('/api/v1/requests', require('./routes/api/v1/requests'));
app.use('/api/v1/execute', require('./routes/api/v1/execute'));
app.use('/api/v1/tests', require('./routes/api/v1/tests'));
app.use('/api/v1/proxies', require('./routes/api/v1/proxies'));
app.use('/api/v1/proxy-pools', require('./routes/api/v1/proxyPools'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 启动服务器
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;
