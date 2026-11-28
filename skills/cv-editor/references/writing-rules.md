# CV writing rules for AI assistants

Goal: a concise one- or two-page CV that (1) parses cleanly in ATS, (2) proves the job's requirements with evidence instead of keywords, (3) reads like a specific person describing specific work, and (4) stays 100% truthful.

## Non-negotiable

1. **Never invent facts.** No made-up numbers, tools, versions, employers, dates, team sizes or scope. A fabricated metric collapses in the interview. If a fact is missing, ask the user, or write the bullet without the number.
2. **Do not overclaim ownership.** Use "led", "designed", "owned" only when the user confirms it. Name what they personally did.
3. **Slop is low information, not bad vocabulary.** A sentence that could sit unchanged in a stranger's CV is slop. Fix it by restoring specifics (what was broken, what they did, with which tool, what changed), never by swapping synonyms or adding fake roughness.

## Bullets

- Use bullets for Experience and Projects. Do not use them for the objective, skills or education.
- 3-5 bullets per role, strongest and most relevant to the target job first. Preserve verified titles and dates, while following the candidate's requested display: if they ask to group an internship or promotion with a main role, use one Experience entry and summarize the earlier period in one bullet without implying the later title applied too early.
- Projects must be listed in reverse chronological order by end date, newest first. Select for role relevance, then sort by verified dates; ask if dates are missing or ambiguous rather than guessing.
- Projects are a supporting section for substantial products and systems, including employer work; they are not limited to personal or school projects. For each selected project, include its name and verified dates, a real overview of the product/system, domain, users, purpose and known scope, one compact `Technologies:` line, then focused bullets that explain the candidate's role and contribution. Keep product context in the overview and personal work in the bullets.
- Formula: need or problem, then action, then tool or method, then result. Every bullet needs at least a concrete action, a tool and an outcome.
- Vary length and opening: verb-first, outcome-first ("Login dropped from ~30s to ~5s after..."), or context-first. One short bullet beside two detailed ones is normal.
- Do NOT put a bold `Label:` prefix on every bullet. Uniform "Label: verb + object + result" is the clearest generated-text pattern.
- Highlight on purpose: bold 1-2 key phrases per bullet (a measured result or the key technology) and the target-role keywords in the objective. Never bold whole sentences or more than two phrases in one bullet.
- No number available: describe the concrete before/after (manual to automated, per-request DB calls to one batched query).
- Prefer a compact before/after such as "~30s to ~5s" when the user confirms both values. If the number is reported rather than measured, say so ("reported"); do not imply internal logs without evidence.

## Words to avoid unless a concrete fact sits next to them

spearheaded, leveraged, utilized, orchestrated, championed, robust, seamless, cutting-edge, passionate, results-driven, detail-oriented, team player, fast learner, proven track record, innovative, "hands-on experience in", "not just X but Y", "high-traffic", em-dashes used for rhythm, triplets used as rhythm.
Vietnamese: đam mê, năng động, tinh thần cầu tiến, không ngừng học hỏi, môi trường chuyên nghiệp.

## Sections (Harvard order for students and early-career)

Custom sections choose a `summary`, `experience`, or `skills` preset. In the experience hierarchy preset, the company is always H2; company dates, job title as H3, and job-title dates are independently toggled. Keep the entry description and bullets below the smallest enabled heading. Other experience presets can inherit the global header style or use classic, role-company, or one-line.

1. Name, then one contact line: city, email, phone, GitHub, LinkedIn.
2. Objective or summary: two lines max. Role + level + 2-3 target technologies + one proof point. Enable only one of the two.
3. Education (first for students and new graduates; after Experience once work experience is the stronger signal).
4. Experience: company, location, title, dates, bullets. Reverse chronological.
5. Projects: selected employer and personal systems that add product context and evidence to Experience; sort by verified dates and start the list on page two when the CV has several substantial projects.
6. Skills: grouped, target stack first. Drop anything the user cannot discuss for 5 minutes. Every key skill should also appear in at least one bullet.
7. Certifications.

Use short one-word section headings by default, while preserving editable custom labels and any longer heading the candidate chooses. Single column. No photo unless the employer asks. No skill bars, icons or tables.

`layout.sectionsOrder` controls the section sequence; `layout.sectionLabels` renames headings. Add `page-break` immediately before the section that should begin on a new page. Custom section keys use `custom:<id>` and one of the supported presets. Keep these layout choices in content JSON, separate from typography config.

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
