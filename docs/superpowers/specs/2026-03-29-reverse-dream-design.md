# 逆梦 (Reverse Dream) Feature Design

## 概述

逆梦功能灵感来自《山海旅人》(The Rewinder) 中"逆梦师进入记忆、改变细节、推演新结局"的核心机制。在 DreamVault 中，逆梦让用户对已有梦境进行改写、视角切换和梦境串联，探索梦境的多种可能性。

## 功能模式

### 1. 改写梦境 (Rewrite)
用户选择一条已有梦境，提供"如果当时…"的假设（AI 建议 3 个或用户自定义），AI 基于假设改写梦境内容，生成新的梦境叙事版本。

### 2. 视角切换 (Perspective)
用户选择一条已有梦境，从另一个角色/视角重新体验。AI 建议 3 个视角（如梦中另一个人、旁观者、象征物），生成新视角下的梦境叙事和全新分析。

### 3. 梦境串联 (Chain)
将多条独立梦境编织成一个连续故事。支持两种触发方式：
- AI 自动发现：扫描所有梦境，找到主题/符号/人物关联，推荐可串联的梦境组
- 手动选择：用户勾选 2-3 条梦境

所有生成结果均可编辑后保存。

## 数据模型

### reverse_dreams 表

```sql
CREATE TABLE reverse_dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,            -- 'rewrite' | 'perspective' | 'chain'
  source_dream_ids TEXT NOT NULL,-- JSON 数组 [1, 3, 5]
  what_if TEXT,                  -- "如果…"假设（rewrite 模式）
  perspective TEXT,              -- 视角名称（perspective 模式）
  generated_content TEXT NOT NULL,-- AI 原始生成内容
  editable_content TEXT,         -- 用户编辑版本（初始 = generated_content）
  metadata TEXT,                 -- JSON 辅助信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/reverse-dreams/suggestions | AI 建议 "如果…" 场景，body: `{ dream_id }` |
| POST | /api/reverse-dreams/rewrite | 改写梦境，body: `{ dream_id, what_if }` |
| POST | /api/reverse-dreams/perspective | 视角切换，body: `{ dream_id, perspective }` |
| POST | /api/reverse-dreams/chain | 梦境串联，body: `{ dream_ids: [] }` |
| GET | /api/reverse-dreams | 列表，支持 ?type= 筛选 |
| GET | /api/reverse-dreams/:id | 详情（含源梦境信息） |
| PUT | /api/reverse-dreams/:id | 编辑 editable_content |
| DELETE | /api/reverse-dreams/:id | 删除 |
| GET | /api/reverse-dreams/discover | AI 自动发现可串联的梦境组 |

## 核心流程

### 改写模式
```
DreamDetail → 点击"逆梦" → 选择"改写梦境"
  │
  ├→ POST /suggestions → AI 返回 3 个 "如果…" 场景
  │  用户选择或自定义输入
  │
  ├→ POST /rewrite → AI 改写梦境
  │  返回: generated_content + 与原文差异解读
  │
  ├→ 展示在可编辑 textarea
  │
  └→ 保存 → reverse_dreams 表
```

### 视角模式
```
DreamDetail → 点击"逆梦" → 选择"视角切换"
  │
  ├→ AI 建议 3 个视角（梦中他人 / 旁观者 / 象征物）
  │  用户选择或自定义
  │
  ├→ POST /perspective → AI 以新视角重述
  │  返回: 新叙事 + 新分析结果
  │
  └→ 可编辑 → 保存
```

### 串联模式
```
逆梦画廊 → 点击"梦境串联"
  │
  ├→ 入口 1: GET /discover → AI 推荐关联梦境组
  ├→ 入口 2: 用户手动勾选 2-3 条
  │
  ├→ POST /chain → AI 编织成连续故事
  │
  └→ 可编辑 → 保存
```

## 前端页面

### DreamDetail 页面修改
- AI 分析区域下方新增逆梦按钮组（改写 / 视角 / 串联）
- 点击展开内联操作面板（不跳转）
- 面板内流程：建议选择 → 生成 → 可编辑 textarea → 保存

### 新增页面：逆梦画廊 `/reverse`
- 顶部 Tab：全部 / 改写 / 视角 / 串联 + 串联入口按钮
- 列表卡片：类型标签、源梦境标题、内容摘要、时间
- 点击进入 `/reverse/:id` 详情

### 详情页 `/reverse/:id`
- 左侧：源梦境原文对照
- 右侧：逆梦内容（可编辑 textarea）
- 保存按钮

### 导航栏修改
- 新增"逆梦"入口（Scroll/BookOpen 图标）

## AI Prompt 设计

### Suggestions Prompt
```
你是梦境分析师。用户给你一段梦境描述，请给出 3 个"如果当时…"的假设性改写方向。
每个方向简短描述（20字以内），并说明可能产生的变化。
返回 JSON: { "suggestions": ["如果...", "如果...", "如果..."] }
```

### Rewrite Prompt
```
你是梦境叙事作家。用户给你一段梦境和一个"如果当时…"的假设，
请基于这个假设改写梦境，保持梦境的奇幻感和叙事张力。
返回 JSON: { "content": "改写后的梦境", "diff": "与原文的关键差异" }
```

### Perspective Prompt
```
你是梦境叙事作家。用户给你一段梦境和一个新的视角，
请从该视角重新叙述这个梦境，保持第一人称沉浸感。
返回 JSON: { "content": "新视角叙事", "analysis": { "emotion": {}, "themes": [] } }
```

### Chain Prompt
```
你是梦境叙事作家。用户给你多条独立梦境，请将它们编织成一个连贯的连续故事。
保持每条梦境的核心元素，添加自然的过渡。
返回 JSON: { "content": "完整故事", "segments": [{"dream_id": 1, "portion": "..."}] }
```

### Discover Prompt
```
你是梦境关联分析师。用户给你多条梦境的摘要，
请找出其中主题、符号、人物有关联的梦境组。
返回 JSON: { "groups": [{"dream_ids": [1,3], "reason": "都出现了水的意象"}, ...] }
```

## 文件变更清单

### 后端
- Modify: `server/db.js` — 添加 reverse_dreams 建表
- Create: `server/routes/reverse.js` — 逆梦 API 路由
- Create: `server/services/reverse.js` — 逆梦 AI 服务（suggestions/rewrite/perspective/chain/discover）
- Modify: `server/index.js` — 挂载 reverse 路由

### 前端
- Modify: `client/src/App.jsx` — 添加 /reverse 路由 + 导航栏入口
- Create: `client/src/pages/ReverseGallery.jsx` — 逆梦画廊
- Create: `client/src/pages/ReverseDetail.jsx` — 逆梦详情页
- Modify: `client/src/pages/DreamDetail.jsx` — 添加逆梦按钮组 + 操作面板
- Create: `client/src/components/ReversePanel.jsx` — 逆梦操作面板组件
- Modify: `client/src/api.js` — 添加 reverse API 方法
