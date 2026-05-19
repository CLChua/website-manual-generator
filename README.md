# Website Manual Generator

English | [简体中文](README.zh-CN.md)

> **AI-powered website documentation generator** — auto-screenshot any website, AI-vision-driven description writing, and one-click generation of Word manuals & PowerPoint presentations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Skill: Claude Code](https://img.shields.io/badge/Skill-Claude_Code-purple.svg)](https://claude.com/claude-code)
[![Playwright](https://img.shields.io/badge/Playwright-1.60+-2EAD33.svg)](https://playwright.dev/)

## 🎯 What is this?

Give it a URL. Get a Word manual and PowerPoint introduction. **Fully automated.**

Most "auto-doc" tools fail because they can only put screenshots into a template. The actual functions in the screenshots remain unidentified, so the descriptions are guessed from module names — and often wrong (e.g., a module named "经营/Business" might actually be **企业知识产权管理 / Enterprise IP Management**).

This project solves that by leveraging **Claude's multimodal vision** to look at each screenshot, understand the real function, and write accurate descriptions. The skill packages the entire workflow so a single user prompt triggers everything.

## ✨ Features

- **Auto-detect site type**: admin / corporate / industry website
- **Auto-discover menus**: no manual config of module names
- **Screenshot validation**: verify breadcrumb of each screenshot to prevent missing pages
- **AI vision descriptions**: Claude reads each screenshot, writes real function descriptions
- **Anti-overlay**: auto-detect and dismiss onboarding tutorials / guide masks
- **Long-page screenshots**: scroll to trigger lazy loading, full-page capture
- **Multi-step automation**: screenshot → vision → write → generate Word/PPT

## 🚀 Usage

### Prerequisites

- Node.js 18+
- [Claude Code](https://claude.com/claude-code) installed
- Playwright (installed via npm)

### Installation

```bash
# 1. Clone this repo
git clone https://github.com/<your-username>/website-manual-generator.git
cd website-manual-generator

# 2. Install dependencies for both generators
cd generators/admin && npm install && cd ../..
cd generators/frontend && npm install && cd ../..

# 3. Install Playwright browser
npx playwright install chromium

# 4. Link skill to Claude Code (Windows)
mklink /D "%USERPROFILE%\.claude\skills\website-manual-generator" "%CD%\skill"

# 4. Link skill to Claude Code (macOS/Linux)
ln -s "$(pwd)/skill" "$HOME/.claude/skills/website-manual-generator"

# 5. Edit skill/SKILL.md and replace `<INSTALL_PATH>` with this repo's absolute path
```

### Generate a manual

Open Claude Code and say:

```
Generate user manual for https://example.com
```

Claude will:
1. Ask the site type, login credentials, and project name
2. Run the screenshot script (Playwright)
3. **Read each screenshot** to understand real functionality
4. Write `descriptions.json` based on actual content
5. Generate `使用手册.docx` and `系统介绍.pptx`

## 📂 Repository Structure

```
website-manual-generator/
├── README.md              # You are here
├── LICENSE                # MIT
├── skill/
│   └── SKILL.md           # Claude Code skill definition
├── generators/
│   ├── admin/             # Backend (admin panel) generator
│   │   ├── index.ts       # Login + menu probe + screenshot
│   │   ├── generate-doc.cjs
│   │   ├── generate-ppt.cjs
│   │   ├── config.json
│   │   └── README.md
│   └── frontend/          # Frontend (public website) generator
│       ├── index.ts       # Nav extraction + scroll + screenshot
│       ├── generate-doc.cjs
│       ├── generate-ppt.cjs
│       ├── config.json
│       └── README.md
└── gen.ts                 # Interactive launcher (optional standalone CLI)
```

## 🧠 How the AI Vision Step Works

Most other tools follow this naive pattern:

```
URL → Screenshot → Template with module names → Output Word/PPT
                   ↑
                   Descriptions are guessed, often wrong
```

This project breaks the loop with **AI vision**:

```
URL → Screenshot → Claude reads each PNG (multimodal) → Real descriptions → Output
                   ↑
                   Sees actual content: table columns, buttons, filters, stats
```

**Example**: A site with a module named "经营" (Business). Without AI vision, you'd get:

> "Business module is used for business operations and data."  ❌ (wrong)

With AI vision (this project), Claude sees the actual screenshot:

> "Enterprise Intellectual Property Risk module. Manages Chinese domain names, trademark protection status, and SSL/security certificates per company."  ✅ (accurate)

## 🎨 Supported Site Types

| Type | Example | Login | Menu | Description |
|------|---------|-------|------|-------------|
| **Admin** | `admin.xxx.com` | ✅ Required | Sidebar | Data tables, forms, business management |
| **Corporate** | `www.company.com` | ❌ Not needed | Top nav | Marketing, products, cases, about |
| **Industry** | E-commerce, community | ✅ Required | Top nav + member area | Public site + login-required pages |

## ⚙️ Configuration

Each generator has its own `config.json`. Most fields auto-fill, but key fields to customize:

```jsonc
{
  "site": {
    "name": "Your Project Name",
    "url": "https://example.com"
  },
  "credentials": {
    "username": "admin",
    "password": "yourpassword"
  },
  // Modules are auto-discovered by default (leave empty array)
  "modules": []
}
```

See [generators/admin/README.md](generators/admin/README.md) and [generators/frontend/README.md](generators/frontend/README.md) for full reference.

## 🛠 Troubleshooting

| Issue | Fix |
|-------|-----|
| Only homepage captured | Menu selector mismatch — add `nav a` to `navSelectors` |
| Screenshot blocked by guide overlay | `dismissOverlay()` already handles common cases; for custom cases, edit `index.ts` |
| Screenshot too dark / animation incomplete | Increase `options.waitAfterLoad` to 10000ms+ |
| Word doc shows empty modules | `descriptions.json` missing or empty — re-run AI vision step |

## 🤝 Contributing

PRs welcome! Areas that need help:

- More website framework adapters (Vue Admin, Ant Design Pro variants, etc.)
- More languages (English/Japanese description templates)
- LLM API integration (use Claude API directly without Claude Code)
- Web-based UI

## 📜 License

[MIT](LICENSE) © 2026

## 🙋 FAQ

**Q: Why does it need Claude Code? Can't I use it standalone?**
A: The AI vision step is the secret sauce. Claude (via Claude Code) reads each screenshot and writes accurate descriptions. Without it, descriptions would be guessed from module names.

**Q: Can I use Claude API directly?**
A: Not yet — this would be a great contribution. Currently the skill assumes Claude Code as the orchestrator.

**Q: Is my password safe?**
A: Credentials are written to a local `config.json` inside your project folder. Never committed to git (covered by `.gitignore`). Only used to log in via Playwright on your machine.

**Q: Does it work on websites with CAPTCHA / 2FA?**
A: Not currently. CAPTCHA breaks automated login. Disable CAPTCHA temporarily for the admin you're documenting, or set `headless: false` to manually solve it once.

**Q: What about the Anthropic API (no Claude Code)?**
A: You can fork this and replace the "AI vision" step with an Anthropic API call (using `claude-opus-4` or similar). See `skill/SKILL.md` for the description schema.

---

⭐ Star this repo if you find it useful!
