# Changelog (Version 1.1.0)

## Your own AI can use this site
- The site calls no AI and needs no API key. **Create with AI** builds a complete prompt (task, field, writing rules, schema, current CV, job description, check results) to paste into ChatGPT, Gemini or Claude.
- The AI answers with a **`#cv=` link** or a JSON block. Click the link, paste the reply into the dialog, or press Ctrl+V anywhere on the page. Every import can be undone.
- Browser agents can use **`window.cvEditor`** (load, patch, audit, downloadPdf...). Instructions for AI live at `/llms.txt`.
- Link data sits after `#` and is never sent to a server.

## Agent Skill
- Download **cv-editor-skill.zip** from Create with AI (or `/cv-editor-skill.zip`). It gives Claude Code, Claude apps and other skill-capable agents the writing rules, the schema and `cv_tool.py` (decode a link, check a CV against a JD, build the hand-off link).
- Create with AI now hands an agent a short request with a link to your current CV; the long copy-paste prompt stays as a fallback for chats without skills.

## CV check (ATS and AI slop)
- A score stays visible in the toolbar. The check panel flags uniform "Label:" bullets, suspiciously even bullet lengths, buzzwords, skills claimed but never shown, low-information bullets, mixed date formats, page count and missing job-description terms. "Go to" opens the section to fix.

## Harvard template
- New default: centered name and contact line, left-aligned uppercase section headings with a rule, bold organization with location, italic title with dates. The old layout remains as Modern.
- Default font is Times (a standard PDF font): files around 8 KB with clean text for ATS. Vietnamese or CJK text switches to an embedded Unicode font.
- Fixed words running together next to bold text, and a broken bullet character in Projects.

## Profile photo
- Choose shape (square, rounded, circle), position (left, right, above the name), three sizes, and crop (fill or fit). Aspect ratio is kept; no more stretched photos.
- Accepts any image the browser can read (JPG, transparent PNG, WebP, GIF, large phone shots) and downsizes it.

## New interface
- Welcome screen for an empty CV, section sidebar (drag, Alt+Arrow, double-click to rename, show/hide), writing tips per section, Edit/Preview switch on phones.
- Autosave: a reload never loses the CV. New share link.
- One-click PDF download. DOCX uses tab stops instead of hidden tables, so ATS reads it in order.
- Large fonts load only when needed, so the page opens much faster.
