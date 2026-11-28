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
6. Match the supplied reference CV's project pattern: project name and dates, one compact `Technologies:` bullet, then one or two concise bullets focused on what the product does and what the candidate implemented. Limit the technology line to the relevant stack; avoid a separate overview when it repeats the contribution bullets.
7. After the content is final, create and return a one-click preview link for that exact CV. Use the CLI link command for a shell agent; for a web-only agent, build the URL-encoded `#cv=` handoff in `references/web.md`. Include the JSON and the preview link in the final answer; a link to the blank website is not a preview link.
8. Do not claim to have rendered a PDF unless you actually ran the renderer.

Only create `config.json` when the user asks to change typography or presentation. It must be complete and contain only formatting keys. See `references/config.md`.
