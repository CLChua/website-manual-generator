---
name: website-manual-generator
version: 1.0.0
description: "AI 网站使用手册生成器：给定网站 URL（后台管理系统或前台网站），全自动完成截图采集、基于截图的 AI 视觉理解写描述、生成 Word 使用手册与 PowerPoint 介绍文档。当用户需要为某个网站生成使用手册/操作文档/介绍 PPT 时使用。支持企业官网、行业网站、后台管理系统三种类型。"
metadata:
  requires:
    bins: ["npx", "node"]
  output:
    docName: "使用手册.docx"
    pptName: "系统介绍.pptx"
---

# Website Manual Generator

为目标网站全自动生成使用手册（Word）和介绍文档（PPT）。

## 何时使用本 skill

用户提出类似需求时触发：
- "帮我生成 https://xxx.com 的使用手册"
- "给这个后台管理系统做一份操作文档"
- "把官网截图整理成 PPT"
- "生成网站手册文档" + 提供 URL

支持三种网站类型：
| 类型 | 示例 | 特征 |
|------|------|------|
| 后台管理系统 | admin.xxx.com | 有侧边菜单、需登录 |
| 企业官网 | www.xxx.com | 展示性网站、无个人中心 |
| 行业网站 | 电商/社区 | 登录后有会员中心 |

## 工具基础设施位置

```
<INSTALL_PATH>\                       # 用户安装本仓库的路径
├── generators\
│   ├── admin\                       # 后台生成器（脚本）
│   │   ├── index.ts                 # 截图脚本
│   │   ├── generate-doc.cjs         # Word 生成
│   │   └── generate-ppt.cjs         # PPT 生成
│   └── frontend\                    # 前台生成器（脚本）
│       ├── index.ts
│       ├── generate-doc.cjs
│       └── generate-ppt.cjs
└── projects\[项目目录]\              # 每次生成的项目（建议放此目录）
    ├── config.json
    ├── screenshots\
    ├── descriptions.json
    ├── 使用手册.docx
    └── 系统介绍.pptx
```

**约定**：在调用脚本前，先用 `Read` 工具读取仓库根目录的 `.skill-install-path` 文件以获取 `<INSTALL_PATH>` 的真实路径；若文件不存在，则提示用户先按 README 完成 install 步骤。

## 标准工作流（4 步）

**CRITICAL：必须按顺序执行所有 4 步，缺一不可。其中第 2 步是本 skill 的核心价值（AI 视觉理解）。**

### 步骤 1：与用户确认信息

必须收集：
- 网站 URL
- 网站类型（后台/企业官网/行业网站）
- 登录账号密码（后台和行业网站需要）
- 项目名（用作文件夹名）

使用 `AskUserQuestion` 工具询问类型，避免猜错。

### 步骤 2：创建项目并执行截图

```bash
# a. 创建项目文件夹
mkdir "C:\Users\qsmx\Downloads\admin-manual\{项目名}"

# b. 写入 config.json（参考下方"配置模板"章节）
# 使用 Write 工具创建 config.json

# c. 运行截图脚本（同步等待完成）
cd "C:\Users\qsmx\Downloads\admin-manual\{项目名}"
npx tsx "..\ai-{admin|frontend}-manual-generator\index.ts" ".\config.json"
```

**注意**：
- 后台生成器会自动探测菜单、登录、点击每个模块截图
- 前台生成器会从导航栏提取链接、滚动长截图、关闭引导遮罩
- 截图完成后会生成 `page-info.json`（前台）或更新 `config.json` 的 modules 字段（后台）

### 步骤 3：AI 视觉理解 → 生成 descriptions.json（**本 skill 的核心**）

**这一步必须由具备视觉理解能力的 AI 完成，不能跳过、不能用脚本占位。**

```
对 screenshots/ 目录下的每张截图：
1. 使用 Read 工具查看截图（AI 助手是多模态模型，可以理解图片内容）
2. 识别页面的真实功能：
   - 看面包屑/页面标题，确认是哪个模块
   - 看页面元素：表格列、按钮、筛选条件、统计指标
   - 看页面板块：Banner、卡片、列表、图表
3. 撰写真实功能描述（中文，面向甲方/管理员）
```

**严禁**：
- 用模块名猜功能（"经营模块" ≠ 经营数据分析，可能是企业知识产权管理）
- 用通用模板（如"XX管理模块用于管理 XX 信息"）
- 跳过这一步（会导致 Word 模块说明空白或错误）

**descriptions.json 格式**：

后台：
```json
{
  "siteIntro": "[基于首页截图描述：这是什么系统、做什么、面向谁]",
  "modules": {
    "模块名": {
      "description": "[基于截图：模块整体功能]",
      "subMenus": {
        "子菜单名": "[基于截图：字段、按钮、筛选条件等细节]"
      }
    }
  }
}
```

前台：
```json
{
  "siteIntro": "[网站定位、核心价值]",
  "designHighlights": "[视觉风格、动效、用户体验亮点]",
  "pages": {
    "页面名": {
      "description": "[页面整体功能]",
      "sections": {
        "区块名": "[区块内容]"
      },
      "highlights": ["亮点1", "亮点2"]
    }
  }
}
```

用 `Write` 工具创建这个文件到项目目录。

### 步骤 4：生成 Word 和 PPT

```bash
cd "C:\Users\qsmx\Downloads\admin-manual\{项目名}"
node "..\ai-{admin|frontend}-manual-generator\generate-doc.cjs" ".\config.json"
node "..\ai-{admin|frontend}-manual-generator\generate-ppt.cjs" ".\config.json"
```

完成后向用户报告：
- 截图数量
- 文档路径
- 文件大小

## 配置模板

### 后台配置（ai-admin-manual-generator/config.json）
```json
{
  "site": {
    "name": "项目名",
    "version": "v1.0",
    "url": "https://admin.xxx.com",
    "loginPath": "/login"
  },
  "credentials": {
    "username": "admin",
    "password": "admin123"
  },
  "selectors": {
    "usernameInput": "input[placeholder='请输入用户名']",
    "passwordInput": "input[placeholder='请输入密码']",
    "loginButton": "button:has-text('登 录')",
    "orgSelector": ".shop-item"
  },
  "modules": [],
  "output": {
    "screenshotDir": "./screenshots",
    "docName": "使用手册.docx",
    "pptName": "系统介绍.pptx"
  },
  "options": {
    "headless": true,
    "viewport": { "width": 1920, "height": 1080 },
    "waitAfterClick": 3000,
    "waitAfterLogin": 5000,
    "waitAfterOrgSelect": 8000
  }
}
```

### 前台配置（ai-frontend-manual-generator/config.json）

参考 `ai-frontend-manual-generator/config.json` 默认值，关键修改：
- `site.url`：目标网址
- `site.type`：`corporate`（企业官网）或 `industry`（行业网站）
- `login.enabled`：行业网站 true，企业官网 false
- `options.waitAfterLoad`：建议 10000（让动画/引导完全加载）

## 故障排查

| 现象 | 可能原因 | 处理 |
|------|---------|------|
| 后台只截到首页 | 菜单选择器不匹配 | 用 Playwright 探测页面结构 |
| 前台只截首页 | navSelectors 不匹配 | 加 `nav a` 兜底 |
| 截图被遮罩遮挡 | 网站有引导弹窗 | dismissOverlay 已处理；如有特殊情况检查 console |
| 截图偏暗 | Banner 动画未完成 | 增加 `waitAfterLoad`（10秒+）|
| 文档模块为空 | descriptions.json 缺失或为空 | 必须先完成步骤 3 |

## 重要原则

1. **AI 看图是核心**：descriptions.json 必须由具备视觉能力的 AI 看真实截图后撰写，不要用脚本占位、不要让用户填写
2. **同步等待**：每一步用 spawnSync/同步 Bash 调用，确保前一步完成后再进行下一步
3. **逐张精读**：每张截图都要单独 Read 一次，写细节（字段名、按钮、状态等）
4. **配置自适应**：根据用户提供的 URL 自动识别类型（含 admin/manage/backend 关键字 → 后台）
5. **报错不静默**：脚本失败立即给用户报告，不掩盖

