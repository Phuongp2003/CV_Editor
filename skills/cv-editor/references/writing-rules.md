# CV writing rules for AI assistants

Goal: a one-page CV that (1) parses cleanly in ATS, (2) proves the job's requirements with evidence instead of keywords, (3) reads like a specific person describing specific work, and (4) stays 100% truthful.

## Non-negotiable

1. **Never invent facts.** No made-up numbers, tools, versions, employers, dates, team sizes or scope. A fabricated metric collapses in the interview. If a fact is missing, ask the user, or write the bullet without the number.
2. **Do not overclaim ownership.** Use "led", "designed", "owned" only when the user confirms it. Name what they personally did.
3. **Slop is low information, not bad vocabulary.** A sentence that could sit unchanged in a stranger's CV is slop. Fix it by restoring specifics (what was broken, what they did, with which tool, what changed), never by swapping synonyms or adding fake roughness.

## Bullets

- Use bullets for Experience and Projects. Do not use them for the objective, skills or education.
- 3-5 bullets per role, strongest and most relevant to the target job first. One page total if under ~5 years of experience.
- Formula: need or problem, then action, then tool or method, then result. Every bullet needs at least a concrete action, a tool and an outcome.
- Vary length and opening: verb-first, outcome-first ("Login dropped from ~60s to ~5s after..."), or context-first. One short bullet beside two detailed ones is normal.
- Do NOT put a bold `Label:` prefix on every bullet. Uniform "Label: verb + object + result" is the clearest generated-text pattern.
- Highlight on purpose: bold 1-2 key phrases per bullet (a measured result or the key technology) and the target-role keywords in the objective. Never bold whole sentences or more than two phrases in one bullet.
- No number available: describe the concrete before/after (manual to automated, per-request DB calls to one batched query).
- Prefer "~60s to ~5s" over "from about 60s to about 5s". If the number is reported rather than measured, say so ("reported", "per internal logs").

## Words to avoid unless a concrete fact sits next to them

spearheaded, leveraged, utilized, orchestrated, championed, robust, seamless, cutting-edge, passionate, results-driven, detail-oriented, team player, fast learner, proven track record, innovative, "hands-on experience in", "not just X but Y", "high-traffic", em-dashes used for rhythm, triplets used as rhythm.
Vietnamese: đam mê, năng động, tinh thần cầu tiến, không ngừng học hỏi, môi trường chuyên nghiệp.

## Sections (Harvard order for students and early-career)

1. Name, then one contact line: city, email, phone, GitHub, LinkedIn.
2. Objective or summary: two lines max. Role + level + 2-3 target technologies + one proof point. Enable only one of the two.
3. Education (first for students and new graduates; after Experience once work experience is the stronger signal).
4. Experience: company, location, title, dates, bullets. Reverse chronological.
   Keep distinct roles at the same company as separate experience records. `experienceCompanyMode` controls display: `separate-titles` shows each role title; `single-title` keeps the first title and folds later roles into their own labeled bullet.
5. Projects: only ones that add evidence the jobs do not.
6. Skills: grouped, target stack first. Drop anything the user cannot discuss for 5 minutes. Every key skill should also appear in at least one bullet.
7. Certifications.

Standard headings only. Single column. No photo unless the employer asks. No skill bars, icons or tables.

## Matching a job description

Split the JD into must-have, nice-to-have and implied requirements. For each must-have, find evidence in the CV:

- **Proven:** a bullet with action and outcome.
- **Claimed:** only in Skills.
- **Adjacent:** a close equivalent (Prisma vs Entity Framework).
- **Absent:** nothing.

Use the JD's exact term where it is true. For Claimed and Absent must-haves, ask the user one targeted question each. Never fill gaps by invention.

## Cover letter

150-250 words. It earns its place by adding what the CV cannot: why this company, why this role, one short story. Opening names the role and company. No "I am writing to apply", no apologies for gaps, no closing platitudes. Research the company if you can; never guess product names.

## Before handing over

- Every number and tool traces back to something the user said.
- No sentence could be pasted unchanged into a stranger's CV.
- One date format everywhere. Dates, titles and company names match across CV and letter.
- List 5-8 interview questions the CV invites, so the user can check they can defend every bullet.
