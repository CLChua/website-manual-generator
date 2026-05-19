# Website Manual Generator

English | [简体中文](README.zh-CN.md)

> **AI-powered website documentation generator** — auto-screenshot any website, AI-vision-driven description writing, and one-click generation of Word manuals & PowerPoint presentations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Playwright](https://img.shields.io/badge/Playwright-1.60+-2EAD33.svg)](https://playwright.dev/)

## 🎯 What is this?

Give it a URL. Get a Word manual and PowerPoint introduction. **Fully automated.**

Most "auto-doc" tools fail because they can only put screenshots into a template. The actual functions in the screenshots remain unidentified, so the descriptions are guessed from module names — and often wrong (e.g., a module named "经营/Business" might actually be **企业知识产权管理 / Enterprise IP Management**).

This project solves that by leveraging **AI multimodal vision** (any vision-capable LLM) to look at each screenshot, understand the real function, and write accurate descriptions. The entire workflow is packaged so a single prompt triggers everything.

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
- An AI assistant with vision capabilities (e.g., Claude, GPT-4V, Gemini) — for the screenshot description step
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

# 4. (Optional) If using an AI agent/skill system, link the skill directory
#    to your agent's skill folder. See skill/SKILL.md for the skill definition.

# 5. Edit config files in generators/{admin,frontend}/config.json for your target site
```

### Generate a manual

Using your AI assistant (or the provided skill), run:

```
Generate user manual for https://example.com
```

The AI assistant will:
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
URL → Screenshot → AI reads each PNG (multimodal) → Real descriptions → Output
                   ↑
                   Sees actual content: table columns, buttons, filters, stats
```

**Example**: A site with a module named "经营" (Business). Without AI vision, you'd get:

> "Business module is used for business operations and data."  ❌ (wrong)

With AI vision (this project), the AI sees the actual screenshot:

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
- LLM API integration (use Anthropic/OpenAI/Google API directly without an AI assistant UI)
- Web-based UI

## 📜 License

[MIT](LICENSE) © 2026

## 🙋 FAQ

**Q: Why does it need an AI assistant with vision? Can't I use it standalone?**
A: The AI vision step is the secret sauce. A vision-capable AI reads each screenshot and writes accurate descriptions. Without it, descriptions would be guessed from module names.

**Q: Can I use an LLM API directly?**
A: Not yet out of the box — this would be a great contribution. Currently the workflow assumes an AI assistant (with vision) as the orchestrator. You can fork this and replace the "AI vision" step with a direct API call to Claude, GPT-4V, or Gemini.

**Q: Is my password safe?**
A: Credentials are written to a local `config.json` inside your project folder. Never committed to git (covered by `.gitignore`). Only used to log in via Playwright on your machine.

**Q: Does it work on websites with CAPTCHA / 2FA?**
A: Not currently. CAPTCHA breaks automated login. Disable CAPTCHA temporarily for the admin you're documenting, or set `headless: false` to manually solve it once.

---

⭐ Star this repo if you find it useful!
