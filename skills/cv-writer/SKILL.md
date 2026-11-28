---
name: cv-writer
description: Write truthful CV and cover-letter content JSON, optionally render it with Fynx CV web or CLI. Use for creating, tailoring, or restructuring a CV for any candidate.
---

# Fynx CV writer

Write candidate-specific content from the user's verified facts and target job. Keep content separate from formatting. Read `references/content.md` first. Load one relevant domain skill (`cv-domain-se`, `cv-domain-qa-automation`, or `cv-domain-industrial-automation`) only when it fits the role. Use `cv-slop-review` only when the user explicitly requests a slop/ATS wording review.

## Workflow

1. Extract employer requirements and map each claim to a source. Ask for missing material facts; never invent dates, metrics, ownership, tools, or deployment status.
2. Write `content.json` with `cv`, optional `coverLetter`, and `layout`. The layout controls section order, visibility and headings. It belongs to content, not `config.json`.
3. For a role with substantial project work, use a concise Work Experience overview plus named selected projects. Do not add a job-title headline below the candidate's name unless the user asks.
4. Preserve verified titles and dates, then follow the candidate's requested presentation. If they ask to group an internship or promotion period under one main Experience entry, use one entry and put the earlier-period work in a single clear bullet without implying the later title applied before its start date.
5. Sort every selected project in reverse chronological order, newest end date first. Use verified project dates, with later start date as the tie-breaker. Do not reorder projects by JD relevance after selecting them. If dates are missing or ambiguous, verify them or ask; never invent dates.
6. Treat Projects as a supporting section that adds product context and evidence to Experience; it can stand on its own and is not limited to personal or school work. Give each substantial selected project a real overview that explains the system/product, domain, users, purpose and verified scale/scope. Make the candidate's role clear in the contribution bullets. Then show the project dates, one compact `Technologies:` line, and focused bullets. Do not turn every feature into a separate project or repeat the same claim in Experience.
7. Run CLI `audit` when the user requests a quality/ATS review. It checks project context, dates, technology lines, project order and bullet evidence; it cannot verify truth. Use `cv-slop-review` only on explicit request.
8. After the content is final, create and return a preview link for that exact CV. Use CLI `link` (or `share`) for a short Worker link; it stores the CV for three days and anyone with the link can view it. If the Worker is unavailable, the CLI falls back to a compressed offline link. For a web-only agent, import the exact JSON in the website and use **More → Copy share link**; do not hand-build a long JSON URL. Explain when the fallback offline link is used. Include the JSON and exact link in the final answer; a link to the blank website is not a preview link.
9. Do not claim to have rendered a PDF unless you actually ran the renderer.

Only create `config.json` when the user asks to change typography or presentation. It must be complete and contain only formatting keys. See `references/config.md`.

Layout is part of `content.json`: use `layout.sectionsOrder` to arrange sections, `layout.sectionLabels` to rename headings, and `customSections` to add one or more sections based on the supported presets. Insert `page-break` in `sectionsOrder` immediately before the section that should start on a fresh page; it adds no heading or text. The editor exposes these controls in the section manager on desktop and mobile.
