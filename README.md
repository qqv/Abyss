# Abyss API Studio

<div align="center">

![Abyss Logo](public/logo.svg)

**🚀 现代化的 API 测试与管理平台**

一个功能强大、界面优美的 API 开发测试工具，支持集合管理、代理池、脚本测试等专业功能

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.16.0-green)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

## ✨ 核心特性

### 🔧 API 测试与管理
- **集合管理**：创建、组织和管理 API 请求集合
- **请求编辑器**：支持 GET、POST、PUT、DELETE 等所有 HTTP 方法
- **参数管理**：查询参数、请求头、请求体（JSON、表单数据、URL编码）
- **环境变量**：多环境支持，动态变量替换
- **批量测试**：并发执行集合中的多个请求
- **历史记录**：完整的请求执行历史和结果追踪

### 📝 高级脚本系统
- **前置脚本**：请求发送前的数据准备和处理
- **测试脚本**：响应验证和断言测试
- **PostMan 兼容**：支持 `pm.*` API，兼容 PostMan 脚本语法
- **变量系统**：动态设置和使用环境变量
- **测试断言**：状态码、响应时间、JSON 数据验证

### 🌐 代理池管理
- **多协议支持**：HTTP、HTTPS、SOCKS4、SOCKS5
- **智能轮换**：随机、顺序、故障转移等轮换策略
- **健康检查**：自动检测代理可用性和响应时间
- **批量导入**：支持文本和文件批量导入代理
- **隧道管理**：创建和管理代理隧道
- **实时监控**：代理状态、响应时间实时监控

### 🔒 安全与性能
- **SSL/TLS 验证**：证书验证和安全连接
- **请求签名**：API 请求签名和认证
- **性能监控**：内存使用、缓存状态、连接池监控
- **请求拦截**：全局请求拦截和处理
- **错误处理**：完善的错误捕获和处理机制

### 📊 数据管理
- **数据导出**：支持 JSON、CSV 格式导出
- **备份恢复**：完整的数据备份和恢复功能
- **存储选择**：浏览器本地存储或数据库存储
- **数据清理**：缓存清理、历史记录管理
- **统计信息**：详细的数据使用统计

### 🎨 用户界面
- **现代设计**：基于 Radix UI 和 Tailwind CSS
- **暗色主题**：支持明暗主题切换
- **响应式布局**：完美适配桌面和移动设备
- **国际化**：中英文双语支持
- **可定制界面**：字体大小、密度、动画设置

### 📋 日志系统
- **分类日志**：API 请求、代理操作、系统事件
- **日志级别**：Debug、Info、Warning、Error
- **实时查看**：实时日志流和搜索过滤
- **导出功能**：支持多种格式导出日志
- **存储管理**：文件系统存储，支持日志轮转

## 🛠️ 技术栈

### 前端技术
- **框架**：Next.js 15.2.4 (React 18.3.1)
- **语言**：TypeScript 5.7.3
- **UI 组件**：Radix UI + Tailwind CSS
- **状态管理**：React Hooks + Context
- **表单处理**：React Hook Form + Zod
- **国际化**：i18next + react-i18next

### 后端技术
- **API**：Next.js API Routes
- **数据库**：MongoDB 6.16.0 + Mongoose 8.15.0
- **代理支持**：http-proxy-agent, socks-proxy-agent
- **文件处理**：JSZip, FileSaver
- **网络请求**：node-fetch, 原生 fetch API

### 开发工具
- **代码规范**：Biome (Linting + Formatting)
- **构建工具**：Next.js + Webpack
- **包管理**：npm / bun
- **部署**：支持 Vercel、Netlify 等平台

## 🚀 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- MongoDB 5.0 或更高版本
- npm、yarn、pnpm 或 bun

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-repo/abyss-api-studio.git
cd abyss-api-studio
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
# 或
bun install
```

3. **环境配置**
```bash
# 复制环境变量文件
cp .env.example .env.local

# 编辑环境变量
# 配置 MongoDB 连接字符串和其他必要设置
```

4. **初始化数据库**
```bash
# 初始化 MongoDB 数据库
npm run mongo-init

# 或使用 TypeScript 初始化脚本
npm run db-init
```

5. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
# 或
bun dev
```

6. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 环境变量配置

创建 `.env.local` 文件并配置以下变量：

```env
# MongoDB 数据库连接
MONGODB_URI=mongodb://localhost:27017/abyss

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# 日志配置
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# 代理配置（可选）
DEFAULT_PROXY_TIMEOUT=10000
MAX_CONCURRENT_REQUESTS=10
```

## 📖 使用指南

### API 集合管理

1. **创建集合**
   - 点击侧边栏的"创建集合"按钮
   - 输入集合名称和描述
   - 组织和管理相关的 API 请求

2. **添加请求**
   - 在集合中添加新的 API 请求
   - 配置请求方法、URL、参数和头部
   - 编写前置脚本和测试脚本

3. **执行测试**
   - 单个请求测试或批量集合运行
   - 实时查看执行进度和结果
   - 分析响应数据和测试结果

### 代理池配置

1. **添加代理**
   - 支持 HTTP、HTTPS、SOCKS4、SOCKS5 协议
   - 单个添加或批量导入
   - 配置认证信息（用户名/密码）

2. **健康检查**
   - 自动检测代理可用性
   - 设置检查间隔和失败阈值
   - 查看代理响应时间统计

3. **隧道管理**
   - 创建代理隧道组
   - 配置轮换策略和规则
   - 监控隧道使用情况

### 脚本编写

**前置脚本示例**：
```javascript
// 设置认证头
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('token')
});

// 生成随机数据
pm.variables.set('randomId', Math.floor(Math.random() * 1000));
```

**测试脚本示例**：
```javascript
pm.test("响应状态码为 200", function () {
    pm.response.to.have.status(200);
});

pm.test("响应时间小于 200ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});

pm.test("响应包含用户ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('userId');
});
```

## 🔧 开发指南

### 项目结构

```
abyss-api-studio/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   ├── globals.css        # 全局样式
│   │   └── layout.tsx         # 根布局
│   ├── components/            # 共享组件
│   ├── features/              # 功能模块
│   │   ├── api-testing/       # API 测试功能
│   │   ├── api-workspace/     # API 工作空间
│   │   ├── proxy-pool/        # 代理池管理
│   │   └── settings/          # 系统设置
│   ├── lib/                   # 工具库和服务
│   ├── models/                # 数据模型
│   └── i18n/                  # 国际化配置
├── public/                    # 静态资源
├── server/                    # Express 服务器（可选）
├── scripts/                   # 构建和部署脚本
└── docs/                      # 项目文档
```

### 开发命令

```bash
# 开发模式
npm run dev

# 代码检查和修复
npm run lint

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 数据库初始化
npm run mongo-init
npm run db-init
```

### 贡献指南

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 Biome 配置的代码风格
- 组件使用 React Hooks 和函数式组件
- API 路由使用 Next.js App Router 约定
- 提交信息遵循 Conventional Commits 规范

## 🌟 功能路线图

### v0.2.0 (计划中)
- [ ] GraphQL API 支持
- [ ] 实时协作功能
- [ ] 插件系统
- [ ] 性能分析工具

### v0.3.0 (计划中)
- [ ] API 文档生成
- [ ] Mock 服务器
- [ ] 自动化测试调度
- [ ] 团队权限管理

### v1.0.0 (目标)
- [ ] 企业级部署支持
- [ ] 高级分析报告
- [ ] 第三方集成
- [ ] 移动端应用

## 🤝 社区与支持

- **问题反馈**：[GitHub Issues](https://github.com/your-repo/abyss-api-studio/issues)
- **功能建议**：[GitHub Discussions](https://github.com/your-repo/abyss-api-studio/discussions)
- **文档**：[项目文档](https://docs.abyss-api.com)
- **邮件支持**：support@abyss-api.com

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源发布。

## 🙏 致谢

感谢以下开源项目的支持：
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Radix UI](https://www.radix-ui.com/) - 无样式 UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [MongoDB](https://www.mongodb.com/) - 现代数据库平台
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的类型化超集

---

<div align="center">

**用 ❤️ 为开发者打造**

[网站](https://abyss-api.com) • [文档](https://docs.abyss-api.com) • [反馈](https://github.com/your-repo/abyss-api-studio/issues)

</div>