# 🇮🇷 Iran Design Job Hunter Bot — Architecture & Specification Guide

This specification document provides the complete architecture, implementation guide, and design rules for building an automated 24/7 Telegram Job Hunter Bot for **UI/UX & Product Design** positions across Iranian job portals.

---

## 🎯 1. Project Goal & Target Profile

### Objective
An automated Telegram bot + 24/7 GitHub Actions scanner that continuously scrapes top Iranian job portals, filters vacancies matching the **Design Profile**, scores them using rule-based heuristics and Google Gemini AI (`gemini-2.5-flash`), and pushes real-time alert cards to Telegram with interactive action buttons (Apply, Mark Checked, Bookmark, Ignore).

### Target Profile (Design Only)
- **Target Roles**:
  - **UI/UX Designer** (Target experience: 3–4 years)
  - **Product Designer** (Target experience: 1–2 years)
  - **UX Researcher / Visual Designer / Interaction Designer**
- **Core Skillset**:
  - Figma, Design Systems, UI/UX, Wireframing, Prototyping, User Research, User Testing, Information Architecture.
- **Excluded Roles (Negative Keywords)**:
  - Frontend Developers, Graphic Designers (Print/Banner/Photoshop-only printing houses), 3D Artists, Industrial Designers, Motion Graphic Designers (unless paired with Product Design), Interior Designers.
- **Location Policy**:
  - Iran (Tehran, Isfahan, Shiraz, etc.) or Remote across Iran. No strict location filtering needed.
- **Language Policy**:
  - Job descriptions are primarily Persian (Farsi) or English. Both are 100% accepted (no disqualification for Persian/English).

---

## 🌐 2. Target Job Boards & Scraping Strategy

### 1. Jobinja (`https://jobinja.ir/`)
- **Search Queries**:
  - `طراح محصول` / `Product Designer`
  - `طراح رابط کاربری` / `طراح تجربه کاربری` / `UI/UX`
  - `طراح UI/UX`
- **Scraping Approach (Cheerio / HTML parsing)**:
  - **Listing URLs**: `https://jobinja.ir/jobs?filters[keywords][]=ui+ux&filters[keywords][]=طراح+محصول`
  - **Selectors**:
    - Item Container: `li.o-listView__item` or `.c-jobListView__item`
    - Title: `.c-jobListView__titleLink`
    - Company: `li.c-jobListView__metaItem:has(span.c-jobListView__metaIcon)`
    - Location: `.c-jobListView__metaItem`
    - Post Date: `.c-jobListView__passedTime`
    - Detail URL: `.c-jobListView__titleLink[href]`
  - **Detail Page**:
    - Full Description: `.o-box__text` or `.c-infoBox__description`
    - Skills & Requirements: `.c-infoBox__tags .c-infoBox__tag`

### 2. Jobvision (`https://jobvision.ir/`)
- **Search Queries**:
  - Keyword search API or Public Search Endpoint: `https://jobvision.ir/jobs/category/ui-ux-product-designer`
- **Scraping Approach**:
  - Jobvision provides structured JSON endpoints for public job searches (e.g., `https://jobvision.ir/api/v1/job-post/search` or public SSR HTML).
  - Extract: Job ID, Title, Company Name, City, Employment Type, Required Experience, Skills, Job URL (`https://jobvision.ir/jobs/<id>`), and full description.

---

## 🏗️ 3. Recommended Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | Node.js 22 LTS + TypeScript (ESM) | Type safety, modern ES modules, LTS compatibility |
| **Telegram Bot** | `grammY` | Ultra-fast, lightweight, TypeScript-first Telegram bot framework |
| **Database** | `better-sqlite3` | Zero-config, single-file SQLite database with WAL mode |
| **Scraping** | `cheerio` + `axios` (or native `fetch`) | Fast server-side HTML parsing without heavy browser overhead |
| **AI Evaluation** | `@google/genai` (`gemini-2.5-flash`) | Semantic alignment scoring and fit summary |
| **CI / Cron Runner** | GitHub Actions | Runs scanner every 15 minutes for free |

---

## 📁 4. Project Directory Structure

```text
iran-design-job-hunter/
├── .github/
│   └── workflows/
│       └── job_scanner.yml       # 24/7 Cron Scanner Workflow
├── data/
│   └── jobs.db                   # SQLite database (cached across workflow runs)
├── src/
│   ├── ai/
│   │   ├── analyzer.ts           # Google Gemini AI job analyzer (gemini-2.5-flash)
│   │   └── schemas.ts            # Zod schema for structured AI responses
│   ├── bot/
│   │   ├── callbacks/
│   │   │   └── job.actions.ts    # Inline buttons: apply, unapply, save, ignore
│   │   ├── commands/
│   │   │   ├── applied.ts        # /applied /checked
│   │   │   ├── help.ts           # /help
│   │   │   ├── jobs.ts           # /design /jobs /latest
│   │   │   ├── resume.ts         # /resume (Portfolio / CV links)
│   │   │   ├── saved.ts          # /saved
│   │   │   ├── settings.ts       # /settings
│   │   │   ├── start.ts          # /start
│   │   │   └── stats.ts          # /stats
│   │   ├── formatters/
│   │   │   └── job.formatter.ts  # Markdown Telegram job cards + inline keyboards
│   │   └── bot.ts                # Bot instantiation, middleware & routing
│   ├── config/
│   │   └── config.ts             # Environment variables validation (dotenv + zod)
│   ├── database/
│   │   ├── db.ts                 # SQLite schema initialization (WAL mode)
│   │   └── job.repository.ts     # CRUD queries for jobs, notifications, user states
│   ├── jobs/
│   │   ├── job.normalizer.ts     # Normalizes raw listings to clean uniform Job objects
│   │   ├── job.scorer.ts         # Heuristic + AI scoring engine
│   │   ├── job.service.ts        # Multi-source orchestration & notification dispatch
│   │   ├── profiles.ts           # Design profile definitions & keywords
│   │   ├── run_scanner.ts        # Standalone script executed by GitHub Actions
│   │   └── types.ts              # TypeScript interfaces & types
│   ├── sources/
│   │   ├── jobinja/
│   │   │   └── jobinja.source.ts # Jobinja scraper
│   │   ├── jobvision/
│   │   │   └── jobvision.source.ts # Jobvision scraper
│   │   ├── source.interface.ts   # Common JobSource interface
│   │   └── source.registry.ts    # Registry of enabled Iranian sources
│   ├── utils/
│   │   └── logger.ts             # Structured console logging
│   └── index.ts                  # Long-polling bot entrypoint
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ 5. Key Implementation Details

### A. Database Schema (`data/jobs.db`)
Create tables with indexes on `id`, `fingerprint`, and `match_score`:
```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_job_id TEXT,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  company TEXT NOT NULL,
  normalized_company TEXT NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  posted_at TEXT,
  discovered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  employment_type TEXT,
  workplace_type TEXT,
  required_experience_years REAL,
  skills TEXT,
  profile TEXT,
  match_score REAL,
  match_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  fingerprint TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS job_notifications (
  job_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  message_id INTEGER,
  PRIMARY KEY (job_id, chat_id)
);

CREATE TABLE IF NOT EXISTS user_state (
  chat_id TEXT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  is_active INTEGER DEFAULT 1,
  min_score REAL DEFAULT 60,
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL
);
```

### B. Normalization & Fingerprinting
Generate a deterministic SHA-256 fingerprint from `source + normalizedCompany + normalizedTitle` so duplicate listings reposted across pages are identified.

### C. Heuristic + AI Scoring (`job.scorer.ts`)
1. **Rule-Based Pre-filter**:
   - Title match: `UI/UX`, `Product Designer`, `طراح محصول`, `طراح تجربه کاربری` (+15 pts)
   - Skills match: Figma, Design Systems, UX Research, Prototyping (+30 pts)
   - Negative match: Graphic Designer (Photoshop/Banner only), Frontend, Developer, Sales (-80 pts)
   - Experience criteria: 1–4 years (+20 pts)
2. **Gemini AI Semantic Analysis (`gemini-2.5-flash`)**:
   - For jobs passing basic rule score (>= 40%), pass description to Gemini.
   - Return structured JSON: `matchScore`, `recommendation`, `reasons`, `concerns`, `summary`.
3. **Database Caching Optimization**:
   - Check if job was already scored in previous runs. If yes, reuse `matchScore` to save AI quota!

### D. Telegram Job Card Layout
```markdown
🟪 🎨 *UI/UX & DESIGN — 85% MATCH* 🟣
> 🎨 *Product Designer / طراح محصول*

🏢 *Studio / Company:* Snapp / اسنپ
📍 *Location:* Tehran (Hybrid)
🕐 *Posted:* 2 hours ago
✨ *Design Tools:* _Figma · Design Systems · User Research_
⏳ *Experience:* 2+ years

🟣 *Design Fit Breakdown:*
💜 Design Skills — Exceptional Match
💜 Experience — Ideal Level

🎯 *Recommendation:* ⭐ *STRONGLY APPLY*

💡 *Why it fits your profile:*
🔸 Target Design role: "Product Designer"
🔸 Core design skill match: Figma & Design Systems
🔸 Experience requirement (2 yrs) fits background perfectly

[🎨 Apply (Design) ↗]
[✅ Mark Checked / Applied]
[⭐ Save]  [❌ Ignore]
```

---

## 🤖 6. GitHub Actions Workflow (`job_scanner.yml`)

Save this exact workflow to `.github/workflows/job_scanner.yml`:

```yaml
name: 🚀 Iran Design Job Hunter 24/7 Scanner

on:
  schedule:
    # Runs automatically every 15 minutes
    - cron: '*/15 * * * *'
  workflow_dispatch: # Allows manual trigger anytime from GitHub Actions tab

jobs:
  hunt_jobs:
    name: 🔍 Scan Iran Design Jobs & Alert Telegram
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4

      - name: ⚙️ Setup Node.js (v22 LTS)
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: 📦 Install Dependencies
        run: npm ci

      - name: 📁 Ensure Data Directory
        run: mkdir -p data

      - name: 🗄️ Cache Jobs Database
        uses: actions/cache@v4
        with:
          path: data
          key: jobs-data-${{ runner.os }}-${{ github.run_id }}
          restore-keys: |
            jobs-data-${{ runner.os }}-

      - name: 🤖 Run Multi-Source Scanner & Gemini AI
        env:
          NODE_ENV: production
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          AI_PROVIDER: gemini
          MIN_MATCH_SCORE: 60
        # Important: use "npm run scan" which runs "tsc && node dist/jobs/run_scanner.js"
        # to avoid native SQLite worker crashes (exit code 139)
        run: npm run scan
```

---

## 📦 7. `package.json` Scripts & Dependencies

```json
{
  "name": "iran-design-job-hunter",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "scan": "tsc && node dist/jobs/run_scanner.js"
  },
  "dependencies": {
    "@google/genai": "^2.22.0",
    "axios": "^1.7.9",
    "better-sqlite3": "^13.0.3",
    "cheerio": "^1.2.0",
    "dotenv": "^16.4.7",
    "grammy": "^1.35.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^9.6.0",
    "@types/node": "^22.13.9",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  }
}
```

---

## 🔑 8. GitHub Secrets Configuration

In your new GitHub repository, navigate to:
**Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**

Add the following 3 secrets:
1. `TELEGRAM_BOT_TOKEN`: The bot token from `@BotFather`.
2. `TELEGRAM_CHAT_ID`: Your personal Telegram user/chat ID (e.g., from `@userinfobot`).
3. `GEMINI_API_KEY`: Google Gemini API Key from Google AI Studio.

---

## 🚀 9. Quick Verification Checklist for New Agent

When giving this prompt to another agent to build:
1. Initialize repository with `npm init -y` and install above dependencies.
2. Ensure TypeScript is configured with `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`.
3. Implement `JobinjaSource` and `JobvisionSource` scrapers.
4. Implement `JobScorer` with Design Profile rules (Product Designer & UI/UX Designer).
5. Implement `JobFormatter` with the purple design aesthetic & inline buttons.
6. Verify locally with `npm run typecheck` and `npm run scan`.
7. Push to GitHub, configure the 3 secrets, and trigger the workflow!
