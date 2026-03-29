# DreamVault

梦境收集 + 管理 + 分析 + 视频生成系统，支持离线使用。

## 功能

- **梦境记录**: 文本录入，支持情绪、睡眠质量、标签
- **AI 分析**: 情绪分析、主题提取、象征解读、视频 prompt 生成
- **视频生成**: 可配置 API，未配置时输出制作信息
- **数据分析**: 情绪趋势、高频主题、反复模式
- **逆梦功能**: 基于梦境的创意改写、视角转换、梦境串联
- **离线支持**: 自动切换本地存储，无需后端即可使用基础功能

## 快速开始

### 本地开发

```bash
# 安装依赖
npm run install:all

# 开发模式（同时启动前端和后端）
npm run dev

# 访问 http://localhost:5173
```

### 生产部署

```bash
# 构建前端
npm run build

# 启动服务
npm start

# 访问 http://localhost:3001
```

### GitHub Pages 部署

项目已配置 GitHub Actions 自动部署：

1. Fork 或克隆此仓库
2. 在 GitHub 仓库设置中启用 GitHub Pages，选择 "GitHub Actions" 作为源
3. 推送到 main 分支会自动触发部署
4. 访问 `https://<username>.github.io/dream-vault/`

**注意**: GitHub Pages 版本使用离线模式，数据存储在浏览器 localStorage 中。

## 离线功能

应用支持完全离线使用：

- **自动检测**: API 不可用时自动切换到本地存储
- **状态提示**: 页面底部显示离线状态横幅
- **数据持久化**: 使用 localStorage 存储，支持以下功能：
  - 梦境的增删改查
  - 基础数据分析
  - 逆梦功能（简化版）
  - 应用设置

**限制**: AI 分析和视频生成需要在线服务。

## 配置

进入设置页面（右上角齿轮图标），配置：

- AI API 地址、Key、模型名称（支持 OpenAI 格式 API）
- 视频生成 API 地址、Key（可选）

## 技术栈

### 前端
- React 18 + React Router 6
- Vite 6（构建工具）
- Tailwind CSS（样式）
- Recharts（图表）
- Lucide React（图标）

### 后端
- Express.js
- better-sqlite3（数据库）
- OpenAI SDK（AI 功能）

## 项目结构

```
dream-vault/
├── client/                 # 前端
│   ├── src/
│   │   ├── api.js         # API 客户端（含离线 fallback）
│   │   ├── localStorageService.js  # 本地存储服务
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   └── context/       # React Context
│   └── vite.config.js
├── server/                 # 后端
│   ├── routes/            # API 路由
│   ├── services/          # 业务逻辑
│   └── db.js              # 数据库
├── .github/workflows/     # GitHub Actions
└── package.json
```

## 开发指南

### 添加新功能

1. 后端 API: 在 `server/routes/` 添加路由
2. 前端 API: 在 `client/src/api.js` 添加方法
3. 离线支持: 在 `client/src/localStorageService.js` 添加对应实现
4. UI 组件: 在 `client/src/components/` 或 `client/src/pages/` 添加

### 数据库迁移

数据库 schema 定义在 `server/db.js`，启动时自动创建表。

## License

MIT
