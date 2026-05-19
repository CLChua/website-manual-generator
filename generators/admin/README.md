# AI网站后台使用手册生成器

自动访问网站后台管理系统，逐页截图验证，生成Word使用手册和PowerPoint介绍文档。

## 核心特性

- **自动探测菜单**：无需手动配置，自动发现网站的所有菜单模块
- **逐页截图验证**：每张截图后检查面包屑，确保页面正确
- **生成文档**：自动生成包含截图的Word使用手册
- **生成PPT**：自动生成系统功能介绍PPT
- **通用适配**：支持Element UI、Ant Design等常见后台框架

## 目录结构

```
ai-admin-manual-generator/
├── config.json          # 配置文件（只需填URL和账号）
├── index.ts             # 主程序：自动探测菜单 + 截图采集
├── generate-doc.cjs     # Word文档生成（必须读取descriptions.json）
├── generate-ppt.cjs     # PPT生成
├── package.json         # 依赖配置
└── README.md            # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置目标网站

编辑 `config.json`，**只需修改这几项**：

```json
{
  "site": {
    "name": "你的系统名称",
    "version": "v1.0.0",
    "url": "https://admin.example.com",
    "loginPath": "/login"
  },
  "credentials": {
    "username": "admin",
    "password": "your-password"
  },
  "selectors": {
    "usernameInput": "input[placeholder='请输入用户名']",
    "passwordInput": "input[placeholder='请输入密码']",
    "loginButton": "button:has-text('登 录')",
    "orgSelector": ".shop-item.admin-item"
  }
}
```

**`modules` 留空 `[]`，程序会自动探测！**

### 3. 运行截图

```bash
npx tsx index.ts
```

程序会自动：
1. 登录系统
2. **自动探测所有菜单模块**（主菜单 + 子菜单）
3. 逐个点击并截图
4. 验证每张截图的面包屑
5. **保存探测结果到 config.json**

### 4. 编写真实功能描述（必须步骤）

**这是生成高质量文档的关键步骤！**

在截图完成后，**必须**逐一查看 `screenshots/` 目录下的截图，根据每个模块的实际功能，编写 `descriptions.json` 文件：

```json
{
  "siteIntro": "[基于截图写系统简介，说明这是什么系统、做什么用的]",
  "modules": {
    "模块名称": {
      "description": "[基于截图写模块整体功能描述]",
      "subMenus": {
        "子菜单名称": "[基于截图写该子功能的具体说明]",
        "子菜单名称2": "[基于截图写说明]"
      }
    }
  }
}
```

**示例**：

```json
{
  "siteIntro": "XX官网后台管理系统是基于 JAVA-B2B2C-PRO v5.8.19 平台开发的网站后台管理工具...",
  "modules": {
    "知产": {
      "description": "企业知识产权与网络资产管理模块。用于管理企业相关的网络资产风险，包括域名注册情况、商标保护状态、SSL证书安全等。",
      "subMenus": {
        "企业知识产权风险": "管理多家企业的知识产权。每家企业可查看中文域名（已注册/风险/推荐）、商标保护（威胁监测）、SSL/企信易安全状态。支持添加/管理企业。"
      }
    },
    "面板": {
      "description": "网站数据统计与分析中心。提供网站综合运营数据的实时监控，包括用户活跃度、流量来源、SEO效果等。",
      "subMenus": {
        "数据概览": "展示全平台DAU/MAU、累计注册用户、企业入驻量、平台GMV、营收额、UV/PV等核心指标。",
        "流量分析": "分析总访问量、访客数、跳出率，按小时展示流量趋势，按来源饼图展示分布（外部链接/社交媒体/搜索引擎/付费推广）。",
        "SEO": "展示SEO综合评分、关键词排名、自然搜索流量、页面收录率，关键词排名趋势和SEO健康度雷达图。"
      }
    }
  }
}
```

**重要原则**：
- **不能**使用预设的通用描述（如"经营模块提供经营概览"）
- **必须**查看每张截图，根据实际界面内容写描述
- 描述应包含：**字段名称**、**操作按钮**、**筛选条件**、**统计指标** 等细节
- 如果不确定功能，标注 `[待确认]` 并在文档中注明

### 5. 生成文档

```bash
# 生成Word手册（读取 config.json + descriptions.json）
node generate-doc.cjs

# 生成PPT
node generate-ppt.cjs
```

## 配置说明

### 必须配置的项

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `site.url` | 后台系统地址 | `https://admin.example.com` |
| `credentials.username` | 登录账号 | `admin` |
| `credentials.password` | 登录密码 | `admin123` |
| `selectors.usernameInput` | 用户名输入框选择器 | `input[type="text"]` |
| `selectors.passwordInput` | 密码输入框选择器 | `input[type="password"]` |
| `selectors.loginButton` | 登录按钮选择器 | `button[type="submit"]` |

### 可选配置的项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `modules` | 菜单模块列表（留空自动探测） | `[]` |
| `options.headless` | 无头模式 | `true` |
| `options.waitAfterClick` | 点击后等待时间(ms) | `3000` |
| `selectors.orgSelector` | 组织选择器（登录后选择后台） | 自动检测 |

## 针对不同系统的适配

### 登录后需要选择组织

如果登录后出现"选择管理后台"页面，配置 `orgSelector`：

```json
"selectors": {
  "orgSelector": ".shop-item.admin-item"
}
```

如果不需要选择（直接进后台），设为：

```json
"selectors": {
  "orgSelector": ""
}
```

### 菜单选择器适配

程序会自动尝试多种常见菜单模式：
- `.main-menu-item.menu_xxx`（Element UI常见）
- `.el-menu-item`
- `.ant-menu-item`
- `.sidebar .menu-item`
- `aside li > a`

如果自动探测失败，可以手动配置 `modules`：

```json
"modules": [
  { "name": "面板", "className": "menu_panel" },
  { "name": "商品", "className": "menu_product" }
]
```

## 输出文件

运行完成后，会在当前目录生成：

- `screenshots/` - 所有验证通过的截图
- `descriptions.json` - 基于截图编写的真实功能描述（必须手动完成）
- `使用手册.docx` - Word格式使用手册（含功能介绍和说明文字）
- `系统介绍.pptx` - PowerPoint功能介绍

### Word手册内容规范

生成的Word手册**必须**包含以下内容，**不能只有截图**：

1. **系统概述**：系统是什么、做什么用的
2. **模块概述**：每个模块开头必须有文字说明该模块的用途和功能
3. **子功能说明**：每个子菜单页面必须有对应的功能描述
4. **操作指引**：关键功能需说明基本操作流程
5. **截图辅助**：截图作为文字说明的辅助，用于直观展示界面

**文档结构示例**：
```
五、产品管理

产品管理模块用于维护产品信息和分类，支持产品列表展示和分类管理。

本模块包含以下功能：
• 产品列表：管理产品信息（名称、编号、类目、品牌、状态等）
• 产品类目：维护产品分类体系

产品列表
管理所有产品信息。列表展示产品编号、名称（含图片、精品/新品/热销标签）、
类目、状态、排序、创建时间等。支持按产品名称/编号、类目、是否精品等筛选，
提供添加产品、批量删除功能。
[截图]

产品类目
维护产品分类体系，配置产品所属类目，便于产品归类展示。
[截图]
```

## 工作流程

```
┌─────────────────┐
│   配置config.json │  ← 填URL、账号、密码
└────────┬────────┘
         ▼
┌─────────────────┐
│   npx tsx index.ts│  ← 自动登录、探测菜单、截图
└────────┬────────┘
         ▼
┌─────────────────┐     ← 必须步骤
│ 查看所有截图       │  ← 了解每个模块的实际功能
│ 编写descriptions.json│
└────────┬────────┘
         ▼
┌─────────────────┐
│ node generate-doc.cjs│  ← 生成Word手册（含真实功能说明）
│ node generate-ppt.cjs│  ← 生成PPT
└─────────────────┘
```

## 技术栈

- **Playwright** - 浏览器自动化
- **docx** - Word文档生成
- **pptxgenjs** - PPT生成
- **TypeScript** - 类型安全

## 注意事项

1. 首次运行会自动下载Chromium浏览器
2. **截图完成后必须逐一查看截图并编写 descriptions.json**
3. 不能依赖模块名称的预设描述，必须基于实际截图内容写说明
4. 建议在有显示器的机器上以 `headless: false` 运行以便观察
5. 网络较慢时可适当增加 `waitAfterClick` 等待时间
