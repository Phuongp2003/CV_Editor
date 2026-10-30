# CV Editor - Professional Resume & Cover Letter Builder

CV Editor is a modern, privacy-focused, and open-source web application designed to help all students and workers write professional CVs (resumes) and cover letters following a layout very close to the Harvard CV format. Built with Vue 3, Pinia, and Nuxt UI, it provides a real-time PDF rendering preview, size scaling adjustments, profile presets, a built-in ATS and AI-slop check, and a hand-off that lets any AI assistant or agent build the CV for you.

No accounts or registrations are required. All editing and state storage are processed locally on the client browser.

## Core Features

### 1. Harvard-style CV and cover letter
- **Harvard template (default):** centered name and contact line, left-aligned uppercase section headings with a rule, ORGANIZATION + location / *Position* + dates, hanging-indent bullets, black only. The original layout stays available as **Modern**.
- **Text-based, ATS-friendly PDF:** Times by default (a standard PDF font: ~8 KB files, clean text extraction). Vietnamese or CJK text switches to an embedded Unicode font automatically.
- **Live preview with page counter**, section navigator (drag, Alt+Arrow, double-click to rename, hide), per-section writing tips, and a mobile Edit/Preview switch.
- **Profile photo modes:** square, rounded or circle; left, right or above the name; three sizes; fill (crop) or fit. Any browser-readable image (JPG, PNG with transparency, WebP, GIF, large phone shots) is resized to a small JPEG in the browser.

### 2. Built-in CV check (no AI, no network)
ATS parse risks and "AI slop" signals computed from the CV structure: uniform `Label:` bullets, bullet length uniformity, repeated openers, buzzwords, skills claimed but never shown, low-information bullets, mixed date formats, page count, and job-description keyword evidence. Each finding links to the section it concerns. Ported from the cv-slop-ats-editor scanner.

### 3. Made for AI assistants and agents
The site never calls an AI. Users bring their own ChatGPT, Gemini or Claude, or an agent drives the page:
- **Create with AI** builds a self-contained prompt (task, field, rules, schema, current CV, job description, check results) to paste into any chat.
- **Hand-off links:** `#cv=<url-encoded JSON>`, `#cv=b64:<base64url>`, `#cv=z:<raw-deflate base64url>` or `#cv-src=<https URL>`; add `&mode=merge` for a patch. The payload sits in the URL fragment and never reaches a server.
- **Paste or drop anywhere:** Ctrl+V of an AI reply (fenced JSON or a link) or dropping a `.json` file imports it. Every import can be undone.
- **`window.cvEditor`** for browser agents: `load`, `patch`, `undo`, `audit`, `pageCount`, `pdfBase64`, `downloadPdf`, `shareLink`, `getState`.
- **Agent Skill:** `skills/cv-editor/` (SKILL.md, references, `scripts/cv_tool.py` with decode / check / link / open / text). `npm run skill` packages it as `public/cv-editor-skill.zip` and mirrors the rules and schema into `public/ai/` (also runs before every build). The site offers the zip in **Create with AI**, with a short request that carries a link to the current CV.
- **Docs for machines:** [`/llms.txt`](public/llms.txt), [`/ai/cv-writing-rules.md`](public/ai/cv-writing-rules.md), [`/ai/schema.json`](public/ai/schema.json).

### 4. Local storage, presets and exports
- Autosave in the browser, 7 named preset slots, share links.
- Export PDF, DOCX (right tab stops instead of layout tables, so ATS reads it in order), HTML and JSON.

---

## Technology Stack

- **Framework:** Vue 3 (Composition API)
- **State Management:** Pinia (stores for CV, Cover Letters, and Prompts)
- **UI Framework:** Nuxt UI v4 (Tailwind CSS theming, modals, drawers, and form controls)
- **Build System:** Vite
- **TypeScript:** Typed schemas for CV structures and workspaces
- **PDF Rendering:** jsPDF text drawing (`src/utils/pdf/renderCv.ts`)
- **Markdown Compiler:** Marked (for versioned changelogs)

---

## Project Setup

### Installation

```bash
npm install
```

### Run Local Development Server

```bash
npm run dev
```

### Type-Check and Build for Production

```bash
npm run build
```

### Run Unit Tests (Vitest)

```bash
npm run test:unit
```

### Run End-to-End Tests (Playwright)

```bash
# Install browsers for playwright
npx playwright install

# Run tests
npm run test:e2e -- --project=chromium
```

---

## Open Source Customization Guide

This project is built to support easy self-hosting, customization, and continuous delivery. Key components can be modified directly on the hosting server without requiring a application rebuild.

### 1. Version Management
- The application version is defined inside [package.json](package.json).
- During development and production builds, Vite reads the package version and automatically bakes it into `import.meta.env.VITE_APP_VERSION` via the `define` block in `vite.config.ts`.
- In CI/CD pipelines, you can also inject the version manually via the `VITE_APP_VERSION` environment variable.

### 2. Customizing the AI hand-off
- Prompt text and field presets: `src/utils/aiPrompt.ts`.
- Instructions for agents: `public/llms.txt`, `public/ai/cv-writing-rules.md`, `public/ai/schema.json`. These are static files; edit them on the host without a rebuild.
- Check heuristics and the editable word lists: `src/utils/cvAudit.ts`.

### 3. Modifying Changelogs
Changelogs are stored as versioned Markdown files and loaded on demand:
- **Directory Location:** `public/change-logs/`
- **Versions List:** `public/change-logs/versions.json` (contains the array of available versions, e.g. `["1.0.1", "1.0.0"]`).
- **Markdown Logs:** `public/change-logs/[version]/vi.md` & `en.md` (no emojis allowed in logs).
- **Runtime Loading:** The settings drawer dynamically fetches `versions.json` to populate the version selector and loads the compiled Markdown content via the `marked` library.

---

## Technical Documentation Reference

Additional technical documentation detailing structural decisions and feature design is available under the `docs/` directory:

- **Architecture Decisions**: Refer to [ADR 0001: Integration of Cover Letter Workspace](docs/adr/0001-cover-letter-workspace.md) for context on workspace decisions.
- **System Design**: Refer to [Cover Letter Workspace Architecture](docs/architecture/cover-letter.md) for details regarding data flow and rendering pipelines.
