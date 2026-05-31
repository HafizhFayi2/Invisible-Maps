# Gemini AI Behavioral Contract (gemini.md)

> [!IMPORTANT]
> **Active AI Model Directive**: You are currently operating as a Gemini Model (e.g., Gemini 3.5, Gemini 1.5 Pro/Flash). This file is your primary brain, containing specialized guidelines, standards, and behavioral optimizations tailored specifically for Gemini's architecture.

---

## 🧠 Gemini Core Cognitive Directives

1. **Leverage Large Context Capabilities**:
   - You have an ultra-large context window. Proactively read entire files (up to the 800-line tool limits) to map out full architectural relationships rather than working with fragmented snippets.
   - Trace full dependency chains (e.g., imports, Supabase schema tables, and custom React hooks) to ensure high-accuracy code modifications.

2. **Function Calling & Tool Execution Precision**:
   - Always verify the arguments of MCP tools and custom local terminal commands before calling them.
   - Run commands using the pre-compiled **RTK (Rust Token Killer)** proxy to maximize token efficiency.

3. **Step-by-Step Chain of Thought**:
   - Before taking action or modifying code, output a brief structural breakdown of your plan.
   - For database migrations or breaking UI layouts, explain the impacts clearly before starting execution.

---

## 🚀 Token Optimization via RTK (Rust Token Killer)

This project has **Rust Token Killer (RTK)** binaries locally integrated under `./bin/` to optimize command outputs, saving 60–90% of token usage.

> [!CAUTION]
> **DO NOT** execute raw shell commands directly. You **MUST** prefix every single terminal command with the correct local RTK binary based on the active operating system:

| Target OS | Command Format / Example |
| :--- | :--- |
| **Windows (x64)** | `.\bin\rtk.exe <command>` (e.g., `.\bin\rtk.exe npm run dev:web`) |
| **macOS (Apple Silicon)** | `./bin/rtk-macos-arm64 <command>` (e.g., `./bin/rtk-macos-arm64 git status`) |
| **macOS (Intel)** | `./bin/rtk-macos-amd64 <command>` |
| **Linux (x64)** | `./bin/rtk-linux-amd64 <command>` |
| **Linux (ARM64)** | `./bin/rtk-linux-arm64 <command>` |

*Note: If you encounter an 'untrusted filters' warning, execute the trust command first: `.\bin\rtk.exe trust`.*

---

## 🛠️ Coding & Architectural Standards

### 1. TypeScript & React
- **TypeScript First**: Always use strict TypeScript typing. Define interfaces/types for all state variables, component props, and API payloads. Avoid using `any` under any circumstances.
- **Modular Component Design**: Break down large React components into small, focused, reusable UI blocks. Move complex presentation logic into custom React hooks (e.g., location fetching, confidence calculations).
- **Mobile-First PWA**: Design with a premium mobile-first approach. Ensure interactive components are fully responsive, touch-friendly, and leverage smooth CSS animations.

### 2. Supabase & Database (PostGIS)
- **Direct Client Usage**: Never hardcode query operations. Utilize the auto-generated Supabase client instance.
- **Verify DB Schema First**: Always check if a column or table exists in `supabase/migrations/` or TypeScript types before writing insert or update queries.
- **PostGIS Geospatial Queries**: Since this project heavily integrates PostGIS (`location` geography), construct geospatial queries using coordinate arrays and correct ST_DWithin / ST_Distance methods.

### 3. Scraping & Automation
- **Log Verbosely**: When writing or editing Python/Node.js scraping scripts, output descriptive JSON-based logging to make debugging in the terminal simple and efficient.

---

## 📋 Common Development Commands

*Run these commands only through the local RTK proxy binary:*

*   **Vite Web Development**: `.\bin\rtk.exe npm run dev:web`
*   **API TS Server**: `.\bin\rtk.exe npm run dev:api`
*   **Run Scraper/TS Scripts**: `.\bin\rtk.exe npx tsx scripts/scrape.ts`
*   **Vitest Execution**: `.\bin\rtk.exe npm run test`
*   **Git Status Checking**: `.\bin\rtk.exe git status`
