# 🇮🇷 Iran Design Job Hunter Bot

Automated 24/7 Telegram Job Hunter Bot and GitHub Actions scanner tailored for **UI/UX & Product Design** positions across Iranian job portals (Jobinja, Jobvision, etc.). Powered by **Google Gemini 2.5 Flash** for deep semantic profile matching and instant alert dispatch.

---

## 🎯 Target Profile
- **Roles**: Product Designer (1–2 yrs), UI/UX Designer (3–4 yrs), UX Researcher, Visual / Interaction Designer
- **Core Skills**: Figma, Design Systems, Wireframing, User Research, Prototyping, Information Architecture
- **Portals**: Jobinja, Jobvision
- **Language**: Persian & English (100% accepted)

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
GEMINI_API_KEY=your_gemini_api_key
AI_PROVIDER=gemini
MIN_MATCH_SCORE=60
```

### 3. Run Locally

- **Start Interactive Telegram Bot (Long-polling mode):**
  ```bash
  npm run dev
  ```

- **Run Single Job Hunting Scan (CLI / Scanner mode):**
  ```bash
  npm run scan
  ```

- **Typecheck & Build:**
  ```bash
  npm run typecheck
  npm run build
  ```

---

## 🤖 Telegram Bot Commands

| Command | Description |
| :--- | :--- |
| `/start` | Initialize bot and register for instant alerts |
| `/jobs` or `/design` | Display top high-match design positions |
| `/saved` | View your bookmarked vacancies |
| `/applied` | Track jobs you have marked as applied |
| `/stats` | View total jobs scanned & match metrics |
| `/settings <score>` | Adjust minimum notification match threshold (e.g., `/settings 75`) |
| `/resume <url>` | Save your portfolio & CV links for quick access |
| `/help` | Detailed bot guide and instructions |

---

## ⚙️ 24/7 GitHub Actions Automation

The repository includes `.github/workflows/job_scanner.yml` which triggers every 15 minutes to scrape, score, cache, and alert matching positions automatically.

Configure the following secrets in GitHub (**Settings ➔ Secrets and variables ➔ Actions**):
1. `TELEGRAM_BOT_TOKEN`
2. `TELEGRAM_CHAT_ID`
3. `GEMINI_API_KEY`
