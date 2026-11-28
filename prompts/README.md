# AI Prompt Hub Configuration

This directory contains the system prompts and Gemini Gems share links loaded dynamically at runtime by the CV Editor application.

## Directory Structure

Each subfolder represents a specific role (`se`, `ba`, `qc`, `po`, `convert`).

```
public/prompts/
├── README.md               # This documentation file
└── [role_id]/              # e.g., se, ba, qc, po, convert
    ├── prompts/
    │   ├── vi.txt          # Vietnamese prompt template
    │   └── en.txt          # English prompt template
    └── gems/
        ├── vi.txt          # Vietnamese Gems share URL link
        └── en.txt          # English Gems share URL link
```

## How It Works

1. **Runtime Fetching:** When a user selects a target role in the Prompt Hub UI, the application dynamically fetches the corresponding text files (`vi.txt` and `en.txt`) from `/prompts/[role_id]/prompts/` and `/prompts/[role_id]/gems/` at runtime.
2. **Cache Prevention:** Fetch requests append a version parameter `?v=<timestamp>` where the timestamp is generated at build time by the CI/CD pipeline (`import.meta.env.VITE_BUILD_TIMESTAMP`), preventing caching issues.
3. **Dynamic UI Adaptation:** 
   - If a prompt language file (e.g., `en.txt`) is empty or missing, the language selection switcher for that language is automatically hidden.
   - If a Gems link file (e.g., `gems/vi.txt`) is empty or missing, the corresponding **Gems Pill** and **Copy Link** buttons are hidden from the UI.
   - This allows developers to easily disable or configure Gems links on the host without rebuilding the application.

## How to Add or Modify Prompts

1. **Modify Existing Prompts:** Update the `.txt` files directly in this folder or on the hosting server. Changes will take effect on the next page reload.
2. **Add a New Role:**
   - Create a folder for the new role under `public/prompts/[new_role_id]/`.
   - Add `prompts/vi.txt`, `prompts/en.txt`, `gems/vi.txt`, `gems/en.txt` (leave Gems files empty if not available).
   - Register the new role metadata in the `promptList` array inside `src/prompts/index.ts` (defining the ID, icon, titles, descriptions, and instructions).
