# DreamVault

梦境收集 + 管理 + 分析 + 视频生成系统，支持离线使用。

灵感来源于 [dream-to-video-skill](https://github.com/mediastormDev/dream-to-video-skill)，将「梦境文本 → AI 分析 → 视频生成」的能力带到本地 Web 应用中。

**在线体验**: https://iyow.github.io/dream-vault/

## 功能

- **梦境记录**: 文本录入，支持情绪、睡眠质量、标签
- **AI 分析**: 情绪分析、主题提取、象征解读、视频 prompt 生成
- **视频生成**: 可配置 API，未配置时输出制作信息
- **数据分析**: 情绪趋势、高频主题、反复模式
- **逆梦功能**: 基于梦境的创意改写、视角转换、梦境串联
- **离线支持**: 自动切换本地存储，无需后端即可使用基础功能

## 快速开始

```bash
npm run install:all
npm run dev
# 访问 http://localhost:5173
```

生产部署：

```bash
npm run build && npm start
# 访问 http://localhost:3001
```

GitHub Pages 版本使用离线模式，数据存储在浏览器 localStorage 中。

## 配置

进入设置页面（右上角齿轮图标），配置 AI API 地址、Key、模型名称（支持 OpenAI 格式 API）以及视频生成 API（可选）。

## 设计文档

详细设计和技术规范见 `docs/superpowers/specs/`：

| 文档 | 内容 |
|---|---|
| [DreamVault 系统设计](docs/superpowers/specs/2026-03-29-dream-vault-design.md) | 技术选型、数据模型、API 端点、核心工作流、LLM prompt 设计 |
| [逆梦功能设计](docs/superpowers/specs/2026-03-29-reverse-dream-design.md) | 改写/视角切换/串联三种模式、数据模型、AI prompt 模板 |

## License

MIT
