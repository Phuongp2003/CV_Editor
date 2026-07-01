# CV Editor - Professional Resume & Cover Letter Builder

CV Editor is a modern, privacy-focused, and open-source web application designed to help all students and workers write professional CVs (resumes) and cover letters following a layout very close to the Harvard CV format. Built with Vue 3, Pinia, and Nuxt UI, it provides a real-time PDF rendering preview, size scaling adjustments, profile presets, and an integrated AI Prompt Hub.

No accounts or registrations are required. All editing and state storage are processed locally on the client browser.

## Core Features

### 1. Dual-Workspace Layout
- **CV Editor:** A form-based builder supporting experience history, education milestones, project contributions, skills, and certifications.
- **Cover Letter Editor:** A dedicated workspace to draft matching professional cover letters.
- **Real-time Previews:** Direct side-by-side rendering of the output page using html2canvas and jsPDF.

### 2. AI Prompt Hub & Assistant
- **STAR Methodology Prompts:** High-quality system prompts tailored for Software Engineers, Business Analysts (BA), Software Quality Control (QC), Product Owners (PO), and Automation Engineers (focused on Factory/Quality or Embedded Systems).
- **CV Converter:** A system prompt designed to clean and structure raw text profiles or legacy resumes from any industry.
- **Gemini Gems Integration:** Supports dynamic loading of Gemini Gems share links directly inside the header.
- **Collapsible Instruction Panel:** A side-by-side instructions guide that can be toggled to maximize the prompt details area.

### 3. Presets & Local Profile Storage
- **Popover Action Menu:** Quick access to load and save states.
- **Visual Modal Slot cards:** Manage up to 7 drafts concurrently with custom naming options.
- **JSON Importer:** Paste JSON blocks directly from AI chats to load states immediately.

### 4. Multi-Format Exports
- Download print-ready PDF files.
- Export structured HTML files.
- Export Microsoft Word compatible DOCX documents.

---

## Technology Stack

- **Framework:** Vue 3 (Composition API)
- **State Management:** Pinia (stores for CV, Cover Letters, and Prompts)
- **UI Framework:** Nuxt UI v4 (Tailwind CSS theming, modals, drawers, and form controls)
- **Build System:** Vite
- **TypeScript:** Typed schemas for CV structures and workspaces
- **PDF Rendering:** html2canvas & jsPDF
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

### 2. Customizing AI Prompts
All system prompts and Gemini Gems share links are fetched dynamically at runtime.
- **Directory Location:** `public/prompts/`
- **Structure:**
  - `public/prompts/[role_id]/prompts/vi.txt`, `en.txt` (System prompts)
  - `public/prompts/[role_id]/gems/vi.txt`, `en.txt` (Gems share links)
- **Adding New Prompts:**
  - Create a new directory under `public/prompts/[new_role_id]/` and fill the text files.
  - Register the new role metadata (ID, icon, title, description, instructions) in the `promptList` array in `src/prompts/index.ts`.
- **Dynamic Visibility:**
  - If a Gems link file or a specific language prompt is empty or missing, the corresponding button (Gems pill, copy link, language toggle) is hidden from the user interface instead of showing a placeholder.

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
