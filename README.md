# DreamVault

梦境收集 + 管理 + 分析 + 视频生成系统

## 快速开始

```bash
# 安装依赖
npm run install:all

# 开发模式
npm run dev

# 生产构建
npm run build && npm start
```

访问 http://localhost:3001

## 功能

- **梦境记录**: 文本录入，支持情绪、睡眠质量、标签
- **AI 分析**: 情绪分析、主题提取、象征解读、视频 prompt 生成
- **视频生成**: 可配置 API，未配置时输出制作信息
- **数据分析**: 情绪趋势、高频主题、反复模式

## 配置

进入设置页面（右上角齿轮图标），配置：
- AI API 地址、Key、模型名称（支持 OpenAI 格式 API）
- 视频生成 API 地址、Key（可选）

## 技术栈

- **后端**: Express + better-sqlite3
- **前端**: React + Vite + Tailwind CSS
- **图表**: Recharts
- **AI**: OpenAI SDK（兼容 OpenAI 格式 API）
