---
name: cv-slop-review
description: Review CV wording for generic claims, ATS parse risks and weak evidence only when the user explicitly asks for a CV quality or AI-slop review.
---

# CV slop and ATS review

Run this only on explicit request. Identify generic bullets, unsupported claims, repeated phrasing, keyword-only skills, date inconsistencies and parse risks. For each finding, quote the specific sentence, explain the missing fact, then rewrite only when evidence exists. Treat the CLI `audit` score as a heuristic, not proof of writing quality or authorship. Never invent metrics to satisfy the score.
