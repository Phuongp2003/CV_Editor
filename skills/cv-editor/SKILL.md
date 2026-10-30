---
name: cv-editor
description: Write, rewrite or tailor a one-page Harvard-style CV (and optional cover letter) as data for the free CV Editor site (cv-editor.fynx.io.vn), check it for ATS and "AI slop" problems, and hand it to the user as a one-click link that renders the PDF. Use whenever the user wants to create a CV/resume, fix or de-slop an existing one, tailor it to a job description or a batch of job posts, convert an old CV (PDF, DOCX, text, LinkedIn) into a clean format, or mentions CV Editor, a cv-editor.fynx.io.vn link, "viết CV", "sửa CV", "CV theo JD", "rải CV". Works in Vietnamese and English.
---

# CV Editor

You write the content. The site (https://cv-editor.fynx.io.vn) renders it as a text-based one-page PDF, runs the same checks, and lets the user export PDF or DOCX. The site never calls an AI and keeps everything in the user's browser.

Your output is a JSON payload (shape: `references/schema.json`) plus a link that opens it on the site. `assets/example.json` shows a complete payload for a **fictional** person: copy its shape, never its facts.

## Tools

`scripts/cv_tool.py` needs Python 3.9+ and nothing else. Call it by its path inside this skill folder:

```bash
python <skill>/scripts/cv_tool.py decode "<#cv= link or file>" -o cv.json
python <skill>/scripts/cv_tool.py check cv.json --jd jd.txt
python <skill>/scripts/cv_tool.py text cv.json
python <skill>/scripts/cv_tool.py link cv.json            # add --merge for a partial update
python <skill>/scripts/cv_tool.py open cv.json            # desktop agents: also opens the browser
```

- `check` prints a score, a JD coverage table (proven / only in Skills / absent), an estimated length (about 62 lines fit on one page), and findings ranked blocker, major, minor. Exit code 1 means a blocker. It is the same check as the site's Check panel, from structure only, not an AI detector.
- `text` shows the CV the way a recruiter skims it. Read it once before handing off.

## Workflow

1. **Collect what exists.** Current CV (decode a link, read a PDF/DOCX, or the user's text), target role, job description, CV language.
2. **Build a fact ledger before writing.** One line per claim you plan to make, with its source:

   ```text
   claim | source | status
   Login ~60s -> ~5s | user + old CV | verified (reported by users)
   25-state workflow refactor | old CV only | unverified: ask
   ```

   Sources: the user's words, the old CV, a repository you can read (`git shortlog -sne`, `git log --author=<name> --format='%ad %s'`), a public page. Then ask in one batch of 3-6 numbered questions, each tied to a bullet: what was broken, what they did, which tool, how it was measured, what they personally owned. Continue with what you know; never block on answers.
3. **Write the JSON.** Read `references/writing-rules.md` first. Never invent numbers, tools, dates, titles or scope; write without a number rather than guess one.
4. **Check and fix.** Run `check` with the JD. Fix every blocker and major you can fix truthfully, re-run. Absent JD terms stay absent unless the user confirms them. If the JD asks for more years than the dates show, say so to the user; never stretch dates.
5. **Hand off.** Run `link` (or `open`) and give the user the link. Opening a full link **replaces** the CV currently open in their browser; the site shows an Undo button. For small edits send only the changed keys with `--merge`. The link carries their contact details and is about 3 KB: if a chat cuts it, give the JSON block instead (the user presses Ctrl+V on the site).
6. **Report briefly:** what changed and why, open questions, and 5-8 interview questions the CV invites, so the user can check they can defend every bullet.

## Many job posts

Keep one base file of verified facts and derive one variant per job: reorder bullets, use the job's exact terms where true, set the objective keywords. Name files `<Company>_<handle>_CV.json`, where `handle` is the user's short name (ask once, or reuse what their existing files use); without a company, use the role. For each job keep the `check` coverage table. Skip companies the user already applied to when they keep a tracker. Tell the user which posts you skipped and why.

## Where you are running

- **Coding agent with a shell** (Claude Code, Codex...): run the script directly; `open` shows the result.
- **Chat app with code execution:** run the script and reply with the link.
- **Agent that controls a browser:** you can also drive the page, see `references/browser-agents.md`. The site's page counter is the real page count; pass it to `check --pages N`.
- **No code execution:** output the payload as one fenced json block; the user pastes it on the site.

## Never

- Invent or round up facts, or present a lab or prototype as production.
- Write an end date for a job the user still holds. If they can start soon, write "Available immediately" or their real notice period.
- Put a bold `Label:` at the start of every bullet, or bold more than two phrases in one bullet.
- Add a photo, tables, columns or skill bars unless the user asks.
