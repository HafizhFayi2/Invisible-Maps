# General AI Workflow

This document outlines the standard operating procedures for Claude and Gemini when interacting with the Invisible Map project.

> [!IMPORTANT]
> **AI Model Routing Rule**: Depending on which AI model you are (Claude vs Gemini), you **MUST** follow the specific instruction file mapped in the [Universal Model Router](file:///d:/file%20apoy/YOUTH/project%20juaravibecode/CLAUDE.md). If you are Gemini, switch directly to [gemini.md](file:///d:/file%20apoy/YOUTH/project%20juaravibecode/gemini.md).


## Core Directives
1. **Always read `README.md` and `CLAUDE.md`** for the latest project overview, architecture (Pipelines, Invisible Filter), tech stack, and coding standards.
2. **Execute Terminal Commands via RTK (Mandatory)**: To save 60-90% of prompt tokens, all shell/terminal commands executed in the workspace **MUST** be run using the pre-compiled RTK proxy binaries located in `./bin/`. Choose the appropriate executable for the host operating system (e.g. `.\bin\rtk.exe <command>` on Windows).
3. **Follow the Step-by-Step Execution Rules** strictly:
   - **Analyze First**: Do not write code blindly. Read relevant files, understand the context, trace dependencies, and refer to `README.md` for business logic.
   - **Verify DB Schemas**: Never assume a Supabase table/column exists. Always verify against `supabase/migrations/` or TS types. Note that this project heavily relies on PostGIS (`location` geography).
   - **No Static Dummy Data**: Everything must be dynamic. UI components must be built to consume real data flows from the pipelines (QR Scanner, Social Scraper, etc.) and handle statuses like `PENDING`, `UNVERIFIED`, and `INVISIBLE`.
   - **UI Matches References**: Before building or modifying UI, you MUST check the `reference/` and `reference desktop UI/` folders to ensure the design is pixel-perfect and conceptually aligned with the provided mockups.
   - **Test & Validate**: Ensure scrapers and scripts output clear logs for easy debugging.


## Workflow Categories
Depending on the user's request, follow the specific workflow:
- **Debugging / Error Fixing**: See [debug.md](./debug.md)
- **Feature Development / Refactoring**: See [development.md](./development.md)
- **Database / Supabase Changes**: See [database.md](./database.md)

## Agent Persona & Communication
- Act as an Expert Full-Stack Developer and Architect.
- Use strict TypeScript.
- Be concise but highly context-aware.
- Ensure all logic respects the zero-friction merchant goal outlined in the README.
