# AI网站前台使用手册生成器

自动遍历网站前台关键页面，逐页长截图，生成面向**甲方客户**的Word使用手册和PowerPoint介绍文档。

## 设计理念

- **目标读者**：甲方客户（非开发者）
- **文档风格**：突出网站价值、视觉设计、用户体验，少技术细节
- **截图方式**：滚动长截图（fullPage），完整呈现页面布局

## 适用场景

支持两类前台网站：

| 类型 | 配置 | 包含会员中心 | 示例 |
|------|------|------------|------|
| **企业官网** | `type: "corporate"` | ❌ | 公司官网、产品展示站 |
| **行业网站** | `type: "industry"` | ✅ | 电商、行业平台、社区 |

## 与后台生成器的区别

| 特性 | 后台生成器 | 前台生成器 |
|------|-----------|-----------|
| 目标读者 | 网站管理员 | 甲方客户 |
| 登录 | 必须登录 | 可选（行业网站需要） |
| 页面发现 | 探测菜单结构 | 从首页导航栏提取 |
| 截图方式 | 全屏截图 | 滚动长截图 |
| 描述重点 | 功能操作步骤 | 页面价值、视觉效果 |

## 目录结构

```
ai-frontend-manual-generator/
├── config.json          # 配置文件（必须修改）
├── index.ts             # 截图脚本：登录 + 导航遍历 + 长截图
├── generate-doc.cjs     # Word文档生成（读取descriptions.json）
├── generate-ppt.cjs     # PPT生成
├── package.json         # 依赖配置
└── README.md            # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置网站

编辑 `config.json`：

**企业官网示例**（不需登录）：
```json
{
  "site": {
    "name": "某某科技官网",
    "url": "https://www.example.com",
    "type": "corporate"
  },
  "login": { "enabled": false },
  "audience": "甲方客户"
}
```

**行业网站示例**（需登录看会员中心）：
```json
{
  "site": {
    "name": "某某行业平台",
    "url": "https://www.example.com",
    "type": "industry"
  },
  "login": {
    "enabled": true,
    "username": "user@example.com",
    "password": "password123",
    "loginPath": "/login",
    "memberPages": [
      { "name": "个人中心", "path": "/user/center" },
      { "name": "我的订单", "path": "/user/order" }
    ]
  }
}
```

### 3. 运行截图

```bash
npx tsx index.ts
```

程序会自动：
1. 访问首页并长截图
2. **从首页导航栏（`nav`、`header`等）提取所有链接**
3. 依次访问每个导航页面并长截图
4. 如启用登录：登录后访问会员中心页面（仅行业网站）
5. 保存页面信息到 `page-info.json`

**截图特性**：
- 滚动到底部触发懒加载（图片、模块按需加载）
- 滚回顶部后全屏截图（`fullPage: true`）
- 完整记录长页面的所有内容

### 4. 编写功能描述（必须步骤）

查看 `screenshots/` 下的截图，编写 `descriptions.json`：

```json
{
  "siteIntro": "[网站定位、面向用户、核心价值]",
  "designHighlights": "[设计风格、视觉特色、技术亮点]",
  "pages": {
    "首页": {
      "description": "[整体介绍：这是什么页面，访客能获得什么]",
      "sections": {
        "顶部Banner": "大图轮播展示核心产品/服务",
        "产品矩阵": "九宫格展示主打产品，悬停有动画",
        "案例展示": "客户案例瀑布流，建立信任"
      },
      "highlights": [
        "全屏沉浸式Banner，视觉冲击力强",
        "动效流畅，交互友好"
      ]
    },
    "关于我们": {
      "description": "...",
      "sections": { ... }
    }
  }
}
```

**面向甲方的描述风格**：

✅ **正确**：
- "首页采用全屏沉浸式 Banner 设计，大图轮播展示核心产品"
- "案例区采用瀑布流布局，访客可流畅浏览所有合作客户"
- "导航栏吸顶设计，滚动时保持可见，便于跳转"

❌ **不要**：
- "首页有Banner组件"（太技术，没价值）
- "使用 Element UI 实现"（甲方不关心）
- "Vue 3 + Vite 构建"（实现细节）

### 5. 生成文档

```bash
node generate-doc.cjs   # 生成Word手册
node generate-ppt.cjs   # 生成PPT
```

## 配置项详解

### `site` - 站点信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✓ | 网站名称 |
| `url` | string | ✓ | 网站根URL |
| `homePath` | string | | 首页路径，默认 `/` |
| `type` | string | ✓ | `corporate`(企业官网) 或 `industry`(行业网站) |

### `login` - 登录配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | boolean | ✓ | 是否启用登录流程 |
| `loginPath` | string | | 登录页路径 |
| `username` / `password` | string | | 登录凭据 |
| `selectors` | object | | 表单元素选择器（自带常见匹配） |
| `memberPages` | array | | 会员页面列表（仅 `industry` 类型生效） |

### `options.navSelectors` - 导航选择器

默认会尝试匹配多种常见导航容器：
- `header nav a`
- `header .nav a`
- `.navbar a`
- `.header-nav a`
- `.main-nav a`

可根据目标网站结构自定义。

### `options.scrollBeforeScreenshot` - 滚动触发懒加载

| 字段 | 默认值 | 说明 |
|------|-------|------|
| `scrollBeforeScreenshot` | `true` | 截图前是否滚动 |
| `scrollSteps` | `5` | 分几步滚到底部 |
| `scrollDelay` | `800` | 每步等待时间(ms) |

## 通用框架设计

由于前台网站样式差异极大，本工具采用以下策略：

1. **多选择器尝试**：导航选择器配置成数组，自动尝试常见模式
2. **配置化排除**：排除登录页、API、静态资源等
3. **类型化适配**：通过 `site.type` 区分企业官网和行业网站
4. **描述驱动**：核心内容由 `descriptions.json` 控制，工具仅负责截图

## 工作流程

```
┌──────────────────┐
│  配置 config.json │  填写URL、登录信息、网站类型
└────────┬─────────┘
         ▼
┌──────────────────┐
│  npx tsx index.ts │  访问首页 → 提取导航链接 → 遍历截图
└────────┬─────────┘  → (登录) → 访问会员页面（行业网站）
         ▼            → 长截图（含懒加载内容）
┌──────────────────┐
│  查看截图          │  逐张查看 screenshots/
│  编写descriptions │  根据真实内容写描述
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 生成 Word / PPT   │  面向甲方语言的最终文档
└──────────────────┘
```

## 输出文件

- `screenshots/` - 所有长截图
- `page-info.json` - 页面元信息（URL、标题、分类）
- `descriptions.json` - 基于截图编写的功能描述（**手动完成**）
- `网站使用手册.docx` - 面向甲方的Word手册
- `网站介绍.pptx` - PowerPoint介绍

## 注意事项

1. 首次运行会自动下载 Chromium
2. 大量长页面会增加截图时间，请耐心等待
3. 部分网站有反爬虫机制，可能需要调整 `User-Agent` 或加入延时
4. 行业网站登录后，建议手动确认 `memberPages` 路径是否正确
5. 长截图会占用较大磁盘空间，建议清理不必要的截图

## 技术栈

- **Playwright** - 浏览器自动化（支持长截图）
- **docx** - Word文档生成
- **pptxgenjs** - PPT生成
- **TypeScript** - 类型安全
