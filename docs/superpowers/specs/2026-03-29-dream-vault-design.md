# DreamVault — 梦境收集 + 管理 + 分析 + 视频生成系统

## 概述

DreamVault 是一个本地运行的单用户 Web 应用，用于记录、管理、分析梦境，并可选择性地将梦境转化为电影级视频。灵感来源于 [dream-to-video-skill](https://github.com/mediastormDev/dream-to-video-skill) 项目。

核心流程：**梦境文本 → AI 分析（情绪/主题/象征） → 生成电影级视频 prompt → 视频生成（可选） → 可视化结果**

## 技术选型

| 层 | 技术 | 说明 |
|---|---|---|
| 后端 | Express + better-sqlite3 | REST API，单进程，SQLite 本地存储 |
| 前端 | React + Vite + Tailwind CSS | SPA，开发体验好 |
| 图表 | Recharts | 情绪趋势、分析可视化 |
| AI 调用 | openai SDK | 兼容 OpenAI 格式 API（支持 Claude/Gemini/本地模型） |
| 视频 | 可配置 HTTP API | 用户自填 API 地址 + Key，未配置则仅输出制作信息 |

## 项目结构

```
dream-vault/
├── server/
│   ├── index.js                 # 入口，Express + 托管前端静态文件
│   ├── db.js                    # SQLite 连接 + 表初始化（自动建表）
│   ├── routes/
│   │   ├── dreams.js            # 梦境 CRUD
│   │   ├── analysis.js          # 分析相关接口
│   │   ├── video.js             # 视频生成接口
│   │   └── settings.js          # 系统设置（API 配置）
│   ├── services/
│   │   ├── ai.js                # LLM 调用封装（分析 + prompt 生成）
│   │   └── video.js             # 视频生成 API 调用封装
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx              # 路由配置
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # 主仪表盘（时间线 + 统计卡片）
│   │   │   ├── DreamEditor.jsx  # 新建 / 编辑梦境表单
│   │   │   ├── DreamDetail.jsx  # 梦境详情 + 分析结果 + 视频
│   │   │   ├── Analysis.jsx     # 全局分析面板（趋势 / 图表）
│   │   │   └── Settings.jsx     # API 配置页面
│   │   ├── components/          # 可复用 UI 组件
│   │   └── api.js               # fetch 封装
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── data/
│   ├── dreamvault.db            # SQLite 数据库
│   └── videos/                  # 视频文件存储
├── package.json                 # 根 package，统一 scripts
└── .gitignore
```

## 数据模型

### dreams 表

```sql
CREATE TABLE dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  dream_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  mood_before TEXT,
  sleep_quality INTEGER,         -- 1-5
  tags TEXT,                     -- JSON 数组
  is_analyzed INTEGER DEFAULT 0,
  is_video_generated INTEGER DEFAULT 0
);
```

### analyses 表

```sql
CREATE TABLE analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dream_id INTEGER NOT NULL,
  emotion TEXT,                  -- JSON {"fear":0.7,"joy":0.2}
  themes TEXT,                   -- JSON 数组 ["自由","逃避"]
  symbols TEXT,                  -- JSON 数组 [{"symbol":"水","meaning":"潜意识"}]
  summary TEXT,
  video_prompt TEXT,
  storyboard TEXT,               -- JSON 分镜信息
  raw_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dream_id) REFERENCES dreams(id)
);
```

### videos 表

```sql
CREATE TABLE videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dream_id INTEGER NOT NULL,
  api_provider TEXT,
  original_path TEXT,
  effect_path TEXT,
  status TEXT DEFAULT 'pending', -- pending/processing/completed/failed
  task_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dream_id) REFERENCES dreams(id)
);
```

### settings 表

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- 存储: video_api_url, video_api_key, ai_api_url, ai_api_key, ai_model
```

## API 端点

### 梦境 CRUD

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/dreams | 列表，支持分页 ?page=1&limit=20、搜索 ?q=、日期筛选 ?from=&to=、标签筛选 ?tag= |
| GET | /api/dreams/:id | 详情，含分析结果 + 视频信息 |
| POST | /api/dreams | 创建梦境 |
| PUT | /api/dreams/:id | 更新梦境 |
| DELETE | /api/dreams/:id | 删除梦境（级联删除分析和视频记录） |

### 分析

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/dreams/:id/analyze | 触发 AI 分析 |
| GET | /api/analysis/overview | 全局概览（情绪分布、主题统计、时间线趋势） |
| GET | /api/analysis/recurring | 反复出现的主题 / 符号 / 元素 |

### 视频生成

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/dreams/:id/video | 触发视频生成 |
| GET | /api/videos/:id/status | 查询生成状态 |

### 设置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/settings | 获取当前配置 |
| PUT | /api/settings | 更新配置 |
| POST | /api/settings/test | 测试 AI / 视频 API 连通性 |

## 核心工作流

### 梦境 → 分析 → 视频

```
用户输入梦境文本
    │
    ▼
POST /api/dreams  →  存入 dreams 表
    │
    ▼
POST /api/dreams/:id/analyze
    │
    ├─→ 调用 LLM API（system prompt 包含分析规则）
    │   返回: 情绪、主题、象征、解读、视频 prompt、分镜
    │
    ├─→ 存入 analyses 表
    └─→ 更新 dreams.is_analyzed = 1
    │
    ▼
POST /api/dreams/:id/video
    │
    ├─→ 检查 settings 中 video_api_url + video_api_key
    │   │
    │   ├─ 已配置 → 调用视频 API → 下载视频到 data/videos/
    │   │          → 存入 videos 表 status=completed
    │   │
    │   └─ 未配置 → 返回分析结果 + video_prompt + storyboard
    │              告知用户视频 API 未配置，提供制作信息供自行使用
    │
    ▼
用户在 DreamDetail 页面查看结果
```

### 视频 API 适配策略

视频 API 通常有两种模式：

1. **同步返回**：直接返回视频二进制流或下载 URL
2. **异步任务**：提交返回 task_id → 轮询状态 → 获取下载 URL

服务层统一处理两种模式，最终将视频下载到本地 `data/videos/` 并记录路径。

## 前端页面

### Dashboard（/）
- 梦境时间线列表（按日期倒序）
- 顶部统计卡片：总数、本月新增、情绪分布饼图
- 快速搜索 + 日期/标签筛选

### DreamEditor（/dream/new, /dream/:id/edit）
- 表单：标题、日期、梦境内容（textarea）、入睡前情绪（选择）、睡眠质量（1-5 星）、标签（输入添加）
- 保存后跳转详情页

### DreamDetail（/dream/:id）
- 梦境原文展示
- AI 分析结果：情绪条形图、主题标签、象征解读卡片、解读摘要
- 视频区域：播放器（有视频时）/ 生成按钮 + 制作信息（无视频时）
- 分镜预览（图文对照）

### Analysis（/analysis）
- 情绪趋势折线图（按时间维度）
- 主题词云 / 高频主题柱状图
- 反复出现的符号/元素列表
- 睡眠质量与情绪关联散点图

### Settings（/settings）
- AI 配置：API 地址、API Key、模型名称
- 视频配置：API 地址、API Key
- 连通性测试按钮 + 结果展示

## LLM System Prompt 设计要点

### 分析 prompt
- 要求返回结构化 JSON
- 包含：emotion（多维情绪权重）、themes（主题数组）、symbols（象征+含义）、summary（200字解读）、video_prompt（电影级描述）、storyboard（分镜数组，每镜含场景描述+镜头语言+时长）

### 视频 prompt 规则
参考 dream-to-video-skill 的 10 条规则：
- photorealistic 风格
- 鱼眼镜头 / 特定运镜
- 无文字叠加
- 无声叙事
- 等等

## 错误处理

- LLM API 调用失败：返回错误信息，允许重试
- 视频 API 调用失败：记录 status=failed，允许重试
- 视频 API 未配置：不报错，返回制作信息供用户自行使用
- 所有 API 端点返回统一格式 `{ success: boolean, data?: any, error?: string }`

## 开发与运行

```bash
# 安装依赖
npm run install:all    # 根 + client

# 开发模式
npm run dev            # 同时启动 Express (3001) + Vite dev server (5173)

# 生产构建
npm run build          # 构建前端，输出到 client/dist
npm start              # Express 托管静态文件，单端口
```
