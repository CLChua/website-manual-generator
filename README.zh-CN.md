# Website Manual Generator

[English](README.md) | 简体中文

> **AI 驱动的网站文档生成器** —— 自动截图任意网站，基于 AI 视觉理解撰写功能描述，一键生成 Word 使用手册与 PowerPoint 介绍文档。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Playwright](https://img.shields.io/badge/Playwright-1.60+-2EAD33.svg)](https://playwright.dev/)

## 这是什么？

给它一个网址，还你一份 Word 手册和 PowerPoint 介绍。**全流程自动化。**

大多数"自动文档"工具只是将截图塞进模板，无法识别截图中的实际功能，描述只能靠模块名猜测 —— 常常出错（例如模块名叫"经营"，实际功能是**企业知识产权管理**）。

本项目利用 **AI 多模态视觉能力**（任何支持视觉理解的 LLM）查看每张截图，理解真实功能，写出准确描述。整个工作流被完整打包，用户只需一句话即可触发全部流程。

## 功能特性

- **自动识别站点类型**：后台管理系统 / 企业官网 / 行业网站
- **自动发现菜单**：无需手动配置模块名称
- **截图验证**：校验每张截图的面包屑，防止漏页
- **AI 视觉描述**：Claude 阅读每张截图，写出真实功能描述
- **遮罩层自动关闭**：自动检测并关闭新手引导蒙层
- **长页面截图**：滚动触发懒加载，全页面截图
- **多步骤自动化**：截图 → 视觉理解 → 撰写 → 生成 Word/PPT

## 使用方法

### 环境要求

- Node.js 18+
- 一个支持视觉理解的 AI 助手（如 Claude、GPT-4V、Gemini）—— 用于截图描述步骤
- Playwright（通过 npm 安装）

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/<your-username>/website-manual-generator.git
cd website-manual-generator

# 2. 为两个生成器安装依赖
cd generators/admin && npm install && cd ../..
cd generators/frontend && npm install && cd ../..

# 3. 安装 Playwright 浏览器
npx playwright install chromium

# 4. （可选）如使用 AI Agent/Skill 系统，将 skill 目录
#    链接到你的 Agent Skill 文件夹。Skill 定义见 skill/SKILL.md。

# 5. 编辑 generators/{admin,frontend}/config.json 配置目标网站
```

### 生成手册

使用你的 AI 助手（或提供的 Skill），运行：

```
生成 https://example.com 的用户手册
```

AI 助手将：
1. 询问站点类型、登录凭据和项目名称
2. 运行截图脚本（Playwright）
3. **阅读每张截图** 理解真实功能
4. 基于实际内容编写 `descriptions.json`
5. 生成 `使用手册.docx` 和 `系统介绍.pptx`

## 仓库结构

```
website-manual-generator/
├── README.md              # 本文件
├── LICENSE                # MIT 协议
├── skill/
│   └── SKILL.md           # Claude Code Skill 定义
├── generators/
│   ├── admin/             # 后台管理系统生成器
│   │   ├── index.ts       # 登录 + 菜单探测 + 截图
│   │   ├── generate-doc.cjs
│   │   ├── generate-ppt.cjs
│   │   ├── config.json
│   │   └── README.md
│   └── frontend/          # 前台网站生成器
│       ├── index.ts       # 导航提取 + 滚动 + 截图
│       ├── generate-doc.cjs
│       ├── generate-ppt.cjs
│       ├── config.json
│       └── README.md
└── gen.ts                 # 交互式启动器（可选的独立 CLI）
```

## AI 视觉步骤如何工作

大多数其他工具遵循这种简单模式：

```
网址 → 截图 → 带模块名的模板 → 输出 Word/PPT
             ↑
             描述靠猜测，经常出错
```

本项目通过 **AI 视觉** 打破这个循环：

```
网址 → 截图 → AI 阅读每张 PNG（多模态） → 真实描述 → 输出
             ↑
             看到实际内容：表格列、按钮、筛选器、统计数据
```

**示例**：一个模块名为"经营"的网站。没有 AI 视觉时，你会得到：

> "经营模块用于业务运营和数据管理。"  ❌（错误）

使用 AI 视觉（本项目），AI 看到实际截图：

> "企业知识产权风险模块。管理中国域名、商标保护状态以及各公司的 SSL/安全证书。"  ✅（准确）

## 支持的站点类型

| 类型 | 示例 | 登录 | 菜单 | 描述 |
|------|---------|-------|------|-------------|
| **后台** | `admin.xxx.com` | 需要 | 侧边栏 | 数据表格、表单、业务管理 |
| **企业官网** | `www.company.com` | 不需要 | 顶部导航 | 营销、产品、案例、关于我们 |
| **行业网站** | 电商、社区 | 需要 | 顶部导航 + 会员区 | 公开页面 + 需登录页面 |

## 配置说明

每个生成器有自己的 `config.json`。大多数字段自动填充，但有几个关键字段需要自定义：

```jsonc
{
  "site": {
    "name": "你的项目名称",
    "url": "https://example.com"
  },
  "credentials": {
    "username": "admin",
    "password": "你的密码"
  },
  // 模块默认自动发现（留空数组）
  "modules": []
}
```

完整配置参考见 [generators/admin/README.md](generators/admin/README.md) 和 [generators/frontend/README.md](generators/frontend/README.md)。

## 常见问题

| 问题 | 解决方法 |
|-------|-----|
| 只截到首页 | 菜单选择器不匹配 —— 将 `nav a` 添加到 `navSelectors` |
| 截图被引导遮罩层阻挡 | `dismissOverlay()` 已处理常见情况；自定义情况请编辑 `index.ts` |
| 截图太暗 / 动画未完成 | 将 `options.waitAfterLoad` 增加到 10000ms 以上 |
| Word 文档显示空模块 | `descriptions.json` 缺失或为空 —— 重新运行 AI 视觉步骤 |

## 参与贡献

欢迎提交 PR！以下领域需要帮助：

- 更多网站框架适配器（Vue Admin、Ant Design Pro 变体等）
- 更多语言（英文/日文描述模板）
- LLM API 集成（不通过 AI 助手 UI，直接调用 Anthropic/OpenAI/Google API）
- Web 界面

## 开源协议

[MIT](LICENSE) © 2026

## 常见问题解答

**Q: 为什么需要支持视觉的 AI 助手？不能独立使用吗？**
A: AI 视觉步骤是核心。一个支持视觉理解的 AI 阅读每张截图并写出准确描述。没有它，描述只能靠模块名猜测。

**Q: 可以直接使用 LLM API 吗？**
A: 目前还没有开箱即用的方案 —— 这将是一个很好的贡献。目前工作流假设使用支持视觉的 AI 助手作为编排器。你可以 Fork 本项目，将"AI 视觉"步骤替换为直接调用 Claude、GPT-4V 或 Gemini 的 API。

**Q: 我的密码安全吗？**
A: 凭据写入项目文件夹内的本地 `config.json`。永远不会提交到 git（受 `.gitignore` 保护）。仅用于通过 Playwright 在本地登录。

**Q: 支持带验证码 / 双因素认证的网站吗？**
A: 目前不支持。验证码会中断自动登录。暂时禁用要文档化的后台的验证码，或将 `headless: false` 设为手动解决一次。

---

⭐ 如果觉得有用，请给仓库点个 Star！
