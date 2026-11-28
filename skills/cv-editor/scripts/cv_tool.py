#!/usr/bin/env python3
"""CV Editor helper for agents. Standard library only.

  decode <link|file|-> [-o out.json]     #cv= link or pasted reply -> JSON
  check  <cv.json> [--jd jd.txt] [--pages N] [--json]
  link   <cv.json> [--merge] [--site URL]
  share  <cv.json> [--site URL] [--api URL]
  open   <cv.json> [--merge] [--site URL]
  text   <cv.json>

The check mirrors src/utils/cvAudit.ts in the CV Editor repo (keep them in sync).
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request
import webbrowser
import zlib
from pathlib import Path

SITE = "https://cv-editor.fynx.io.vn"
SHARE_API = "https://cv-editor-share-worker.phambuinamphuong.workers.dev"

# ─── Payload I/O ──────────────────────────────────────────────────────────────

CV_KEYS = ("cv", "coverLetter", "name", "experiences", "skills", "sectionsOrder")


def parse_payload_text(raw: str) -> dict:
    """Accepts a bare object, a fenced json block inside chatter, or citation markers."""
    text = raw.strip().lstrip("﻿")
    fences = re.findall(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fences:
        text = fences[-1].strip()
    else:
        a, b = text.find("{"), text.rfind("}")
        if a >= 0 and b > a:
            text = text[a : b + 1]
    text = re.sub(r"\[cite_start\]|\[cite:[^\]]*\]", "", text)
    data = json.loads(text)
    if not isinstance(data, dict) or not any(k in data for k in CV_KEYS):
        raise ValueError("not a CV Editor payload")
    return data


def _b64url_decode(s: str) -> bytes:
    s = re.sub(r"\s", "", s)
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def decode_link(link: str) -> dict:
    parsed_url = urllib.parse.urlsplit(link.strip())
    short_id = urllib.parse.parse_qs(parsed_url.query).get("cv", [None])[0]
    if short_id:
        request = urllib.request.Request(f"{SHARE_API}/api/shares/{urllib.parse.quote(short_id)}")
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
        payload = result.get("payload")
        if not isinstance(payload, str):
            raise ValueError("share service returned no CV payload")
        return parse_payload_text(zlib.decompress(_b64url_decode(payload), -15).decode("utf-8"))
    m = re.search(r"#(cv(?:-src)?)=([^\s)\]\"'<>]+)", link)
    if not m:
        return parse_payload_text(link)
    key, value = m.group(1), m.group(2)
    value = re.sub(r"&mode=(merge|replace)$", "", value)
    if key == "cv-src":
        url = urllib.parse.unquote(value)
        with urllib.request.urlopen(url, timeout=20) as r:  # noqa: S310 - https URL given by the user
            return parse_payload_text(r.read().decode("utf-8"))
    if value.startswith("z:"):
        return parse_payload_text(zlib.decompress(_b64url_decode(value[2:]), -15).decode("utf-8"))
    if value.startswith("b64:"):
        return parse_payload_text(_b64url_decode(value[4:]).decode("utf-8"))
    if value.startswith("json:"):
        value = value[5:]
    return parse_payload_text(urllib.parse.unquote(value))


def _packed_payload(data: dict) -> str:
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    packed = c.compress(raw) + c.flush()
    return base64.urlsafe_b64encode(packed).decode().rstrip("=")


def _preview_url(site: str, *, packed: str | None = None, share_id: str | None = None) -> str:
    parts = urllib.parse.urlsplit(site.rstrip("/") + "/")
    query = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
    query = [(key, value) for key, value in query if key not in {"view", "cv"}]
    query.append(("view", "preview"))
    fragment = ""
    if share_id:
        query.append(("cv", share_id))
    else:
        fragment = f"cv=z:{packed}"
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), fragment))


def encode_link(data: dict, site: str = SITE, merge: bool = False) -> str:
    link = _preview_url(site, packed=_packed_payload(data))
    if merge:
        parts = urllib.parse.urlsplit(link)
        link = urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, f"{parts.fragment}&mode=merge"))
    return link


def create_share_link(data: dict, site: str = SITE, api: str = SHARE_API) -> tuple[str, int | None]:
    """Creates a short-lived Worker link and falls back to a self-contained preview URL."""
    body = json.dumps({"payload": _packed_payload(data)}).encode("utf-8")
    request = urllib.request.Request(
        f"{api.rstrip('/')}/api/shares",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
        share_id = result.get("id")
        if not isinstance(share_id, str) or not share_id:
            raise ValueError("share service returned no link id")
        expires_at = result.get("expiresAt")
        return _preview_url(site, share_id=share_id), expires_at if isinstance(expires_at, int) else None
    except (OSError, TimeoutError, ValueError, json.JSONDecodeError):
        return encode_link(data, site), None


def load(path: str) -> dict:
    return parse_payload_text(Path(path).read_text(encoding="utf-8"))


def cv_of(data: dict) -> dict:
    return data.get("cv", data)


# ─── Check (mirror of cvAudit.ts) ─────────────────────────────────────────────

CLICHES = [
    "spearheaded", "leveraged", "leveraging", "utilized", "utilizing", "orchestrated", "championed", "synergy",
    "robust", "seamless", "cutting-edge", "passionate", "results-driven", "detail-oriented", "team player",
    "fast learner", "proven track record", "innovative", "holistic", "delve", "tapestry", "testament",
    "pivotal", "vibrant", "learning mindset", "contribute effectively", "i am writing to apply",
    "i am excited to", "hands-on experience in", "not just", "more than just", "thank you for considering",
    "practical exposure", "dynamic environment", "high-traffic", "world-class", "game-changer",
    "đam mê", "năng động", "tinh thần cầu tiến", "không ngừng học hỏi", "môi trường chuyên nghiệp", "đóng góp hết mình",
]
WEAK = ["worked on", "helped", "assisted", "responsible for", "involved in", "participated in", "supported",
        "tham gia", "hỗ trợ", "phụ trách"]
STOP = set(("a an the and or of to in on for with at by from as is are was were be been it its this that these those i my "
            "me we our you your their they he she his her not no but if so than then into about over under via per use used "
            "using have has had will can could would should may might also other such each both all any more most và của là có "
            "cho với các một những được trong khi để này đã đang không").split())
STANDARD_HEADINGS = {"summary", "objective", "experience", "work experience", "professional experience", "education",
                     "skills", "technical skills", "projects", "certificates", "certifications", "kinh nghiệm", "học vấn",
                     "kỹ năng", "dự án", "chứng chỉ", "mục tiêu", "tóm tắt"}
TOOL_RE = re.compile(r"\b(?:[A-Z][a-z]+[A-Z][A-Za-z0-9]*|[A-Za-z]+[.#+][A-Za-z0-9.#+]+|[A-Z]{2,}[a-z0-9]*|[A-Za-z]+\d+[A-Za-z0-9]*)\b")
BEFORE_AFTER_RE = re.compile(r"\bfrom\b.{1,40}\bto\b|→|->|\bgiảm\b.{1,30}\bxuống\b|\d+\s?%|\d+\s?(x|×)\b", re.I)
LABEL_RE = re.compile(r"^[A-Z][A-Za-z0-9 &/+.\-]{2,40}:\s")
WEIGHTS = {"blocker": 25, "major": 10, "minor": 3}

# Known technologies and practices, matched as whole terms (case-insensitive). Display form as written here.
TECH_TERMS = [
    "C#", ".NET", ".NET Core", ".NET Framework", "ASP.NET", "ASP.NET Core", "ASP.NET MVC", "Web API", "Entity Framework",
    "EF Core", "LINQ", "SignalR", "Blazor", "WPF", "WinForms", "SQL Server", "T-SQL", "stored procedures", "MySQL",
    "MariaDB", "PostgreSQL", "Oracle", "MongoDB", "Redis", "Elasticsearch", "RabbitMQ", "Kafka", "Azure Service Bus",
    "Service Bus", "Azure", "Azure DevOps", "AWS", "GCP", "Docker", "Kubernetes", "CI/CD", "GitHub Actions", "GitLab CI",
    "Jenkins", "xUnit", "NUnit", "MSTest", "unit test", "integration test", "TDD", "REST", "RESTful", "GraphQL", "gRPC",
    "microservices", "API gateway", "Angular", "React", "Vue", "Next.js", "TypeScript", "JavaScript", "HTML", "CSS",
    "Node.js", "Express", "NestJS", "Python", "FastAPI", "Django", "Flask", "Java", "Spring Boot", "PHP", "Laravel",
    "Ruby on Rails", "C++", "Golang", "OAuth", "JWT", "Keycloak", "Git", "Agile", "Scrum", "Linux", "Nginx",
    "design patterns", "SOLID", "OOP", "clean architecture", "DDD", "English", "Japanese",
]
# A JD term counts as shown when any of its aliases appears.
ALIASES = {
    "entity framework": ["ef core", "entity framework core"],
    "ef core": ["entity framework core", "entity framework"],
    ".net": [".net core", ".net 5", ".net 6", ".net 7", ".net 8", ".net 9", "asp.net"],
    ".net core": [".net 5", ".net 6", ".net 7", ".net 8", ".net 9", "asp.net core"],
    "asp.net": ["asp.net core"],
    "rest": ["restful", "rest api", "rest apis"],
    "restful": ["rest api", "rest apis"],
    "web api": ["rest api", "rest apis", "asp.net core"],
    "ci/cd": ["github actions", "gitlab ci", "azure devops", "jenkins", "continuous integration"],
    "unit test": ["unit tests", "unit testing", "xunit", "nunit", "mstest"],
    "service bus": ["azure service bus"],
    "microservices": ["microservice"],
    "vue": ["vue 3", "vue.js"],
    "react": ["react.js", "reactjs"],
    "node.js": ["nodejs"],
    "python": ["fastapi", "django", "flask"],
    "kubernetes": ["k8s"],
    "english": ["toeic", "ielts", "toefl"],
}


def term_re(term: str) -> re.Pattern:
    return re.compile(r"(?<![A-Za-z0-9])" + re.escape(term) + r"(?![A-Za-z0-9])", re.I)


def has_term(text: str, term: str) -> bool:
    return any(term_re(t).search(text) for t in [term, *ALIASES.get(term.lower(), [])])


def jd_terms_of(jd: str) -> list[str]:
    """Known tech terms in JD order, then other words the JD repeats."""
    found = []
    for term in TECH_TERMS:
        m = term_re(term).search(jd)
        if m:
            found.append((m.start(), term))
    terms = [t for _, t in sorted(found)]
    # Drop a short term when a longer found term contains it (".NET" when ".NET Core" is there is fine to keep both;
    # but "Service Bus" inside "Azure Service Bus" is noise).
    terms = [t for t in terms if not any(t != o and t.lower() in o.lower() and t.lower() == "service bus" for o in terms)]
    # Beyond the dictionary, only tool-like names (Aspose.Words, OData, Dapper...) from requirement-like lines.
    # Plain repeated words pull in company marketing ("mission", "people"), so they are not used.
    req = re.compile(r"(?i)experience|knowledge|proficien|familiar|skill|understanding|hands-on|expertise|must|requir|strong|solid|plus")
    known = {t.lower() for t in TECH_TERMS}
    extra: list[str] = []
    for line in jd.splitlines():
        if not req.search(line):
            continue
        for tok in TOOL_RE.findall(line) + re.findall(r"(Dapper|Moq|Selenium|Playwright|Cypress|Knockout\.js|jQuery|OData|Razor|Aspose\.\w+)", line):
            low = tok.lower()
            if len(tok) < 3 or low in known or any(low == t.lower() for t in terms) or tok in extra:
                continue
            if re.search(r"\.(com|net|org|vn|io)$|^e\.g|^i\.e", low):
                continue  # domains and abbreviations
            if low.endswith(".js") and low[:-3] in known:
                continue  # Vue.js / React.js when Vue / React are already known terms
            if any(low in [a.lower() for a in ALIASES.get(t.lower(), [])] for t in terms) or low in ("k8s", "sql"):
                continue  # alias of a term already listed (K8s for Kubernetes; plain SQL next to SQL Server)
            if re.fullmatch(r"[A-Z]{2,4}", tok) and tok not in ("ORM", "SQL", "API", "MVC", "DDD", "TDD", "SPA"):
                continue
            extra.append(tok)
    return (terms + extra)[:35]


def months_between(a: str, b: str, today: tuple[int, int]) -> int:
    def ym(s: str):
        s = s.strip()
        if re.match(r"(?i)present|now|nay|hiện tại", s):
            return today
        m = re.search(r"(\d{1,2})/(\d{4})", s)
        if m:
            return int(m.group(2)), int(m.group(1))
        m = re.search(r"(\d{4})", s)
        return (int(m.group(1)), 1) if m else None
    x, y = ym(a), ym(b)
    if not x or not y:
        return 0
    return max(0, (y[0] - x[0]) * 12 + (y[1] - x[1]) + 1)


def experience_months(cv: dict, today: tuple[int, int]) -> int:
    """Union of experience date ranges, in months."""
    spans = []
    for e in cv.get("experiences", []):
        parts = re.split(r"\s+[-–]\s+", e.get("dates", ""))
        if len(parts) == 2:
            n = months_between(parts[0], parts[1], today)
            if n:
                start = months_between("01/1970", parts[0], today)
                spans.append((start, start + n))
    spans.sort()
    total, cur = 0, None
    for a, b in spans:
        if cur and a <= cur[1]:
            cur = (cur[0], max(cur[1], b))
        else:
            if cur:
                total += cur[1] - cur[0]
            cur = (a, b)
    if cur:
        total += cur[1] - cur[0]
    return total


def estimate_lines(data: dict) -> int:
    """Rough line count of the Harvard PDF at size 1.0 (about 62 lines fit on one page; calibrated on real renders)."""
    cv = cv_of(data)
    disabled = set(data.get("disabledSections", ["summary"]))
    one_line = data.get("experienceHeaderStyle") == "one-line"
    company_mode = data.get("experienceCompanyMode", "separate-titles")
    wrap = lambda t, w=104: max(1, math.ceil(len(plain(t)) / w))
    n = 3
    for sec in data.get("sectionsOrder") or ["objective", "experience", "projects", "education", "skills", "certificates"]:
        if sec in disabled:
            continue
        if sec in ("objective", "summary") and cv.get(sec):
            n += 2 + wrap(cv[sec])
        elif sec == "experience" and cv.get("experiences"):
            n += 2
            prev = None
            for e in cv["experiences"]:
                same = prev and prev.lower() == e.get("company", "").lower()
                if same:
                    n += 0 if company_mode == "single-title" else 1
                else:
                    n += 1 if one_line else 2
                n += sum(wrap(b.get("text", ""), 98) for b in e.get("bullets", []))
                prev = e.get("company", "")
        elif sec == "projects" and cv.get("projects"):
            n += 2 + sum(1 + sum(wrap(b.get("text", ""), 98) for b in p.get("bullets", [])) for p in cv["projects"])
        elif sec == "education" and cv.get("educations"):
            n += 2 + 2 * len(cv["educations"])
        elif sec == "skills" and cv.get("skills"):
            n += 2 + sum(wrap(f"{s.get('skill', '')}: {s.get('description', '')}") for s in cv["skills"])
        elif sec == "certificates" and cv.get("certificates"):
            n += 2 + len(cv["certificates"])
    return n


def plain(t: str) -> str:
    t = re.sub(r"</?u>", "", t or "", flags=re.I)
    return re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", t).strip()


def words(t: str) -> list[str]:
    return t.split()


def content_words(t: str) -> list[str]:
    out = []
    for w in re.findall(r"[a-zà-ỹ][a-zà-ỹ0-9+#.\-]*", t.lower()):
        w = w.strip(".-")
        if len(w) > 2 and w not in STOP:
            out.append(w)
    return out


def lumpiness(vals: list[int]) -> float | None:
    if len(vals) < 3:
        return None
    m = sum(vals) / len(vals)
    if not m:
        return None
    return round(math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals)) / m, 2)


def specificity(b: str) -> int:
    s = 0
    s += bool(re.search(r"\d", b))
    s += bool(BEFORE_AFTER_RE.search(b))
    s += len(set(TOOL_RE.findall(b))) >= 2
    s += len(words(b)) >= 12
    low = b.lower()
    if any(w in low for w in WEAK + CLICHES):
        s -= 1
    return max(s, 0)


def date_format(d: str) -> str | None:
    d = d.strip()
    if not d:
        return None
    if re.search(r"\b\d{2}/\d{4}\b", d):
        return "MM/YYYY"
    if re.search(r"\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b", d):
        return "Month YYYY"
    if re.search(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? \d{4}\b", d):
        return "Mon YYYY"
    if re.fullmatch(r"\d{4}", d):
        return "YYYY"
    return "other"


def audit(data: dict, jd: str = "", pages: int = 0) -> dict:
    cv = cv_of(data)
    disabled = data.get("disabledSections", ["summary"])
    labels = data.get("customSectionLabels", {}) or {}
    bullet_l1 = (data.get("bulletChars") or {}).get("l1", "•")
    findings: list[dict] = []

    def add(fid, sev, cat, title, detail, quotes=None, target=None):
        findings.append({"id": fid, "severity": sev, "category": cat, "title": title, "detail": detail,
                         "quotes": quotes or [], "target": target})

    intro_key = "objective" if "objective" not in disabled else "summary"
    intro = plain(cv.get(intro_key, "")) if intro_key not in disabled else ""
    bullets = []
    for sec, key in (("experience", "experiences"), ("projects", "projects")):
        if sec in disabled:
            continue
        for i, entry in enumerate(cv.get(key, [])):
            for b in entry.get("bullets", []):
                t = plain(b.get("text", ""))
                if b.get("type", "l1") != "header" and t:
                    bullets.append({"text": t, "section": sec, "index": i})
    texts = [b["text"] for b in bullets]
    # Context lines under a company ("header" bullets) are evidence too, though not bullets.
    context = [plain(b.get("text", "")) for key in ("experiences", "projects") for e in cv.get(key, [])
               for b in e.get("bullets", []) if b.get("type") == "header"]
    skills_on = "skills" not in disabled
    skills_text = "\n".join(f"{s.get('skill', '')}: {plain(s.get('description', ''))}" for s in cv.get("skills", [])) if skills_on else ""
    full = "\n".join([intro, skills_text, *texts])
    total_words = len(words(full))

    missing = [k for k in ("name", "email", "phone") if not str(cv.get(k, "")).strip()]
    if missing:
        add("ats-contact", "blocker", "ats", "Missing contact details", f"Add: {', '.join(missing)}.", target="personal")

    dates = ([e.get("dates", "") for e in cv.get("experiences", [])] if "experience" not in disabled else []) + \
            ([e.get("graduationDate", "") for e in cv.get("educations", [])] if "education" not in disabled else [])
    fmts = {f for f in map(date_format, dates) if f and f != "YYYY"}
    if len(fmts) > 1:
        add("ats-dates", "minor", "ats", "Mixed date formats", f"Found {', '.join(sorted(fmts))}. Use one format.", [d for d in dates if d])
    est = estimate_lines(data)
    if not pages and est > 62:
        add("ats-pages-est", "major", "ats", f"Probably longer than one page (~{est} lines, about 62 fit)",
            "Confirm with the page counter on the site, then cut the weakest bullets.")
    if pages > 1:
        add("ats-pages", "major", "ats", f"CV runs to {pages} pages",
            "Under ~5 years of experience, keep one page. Cut the weakest bullets, not the font size.")
    odd = [v for k, v in labels.items() if v and v.strip() and k not in disabled and v.strip().lower() not in STANDARD_HEADINGS]
    if odd:
        add("ats-headings", "minor", "ats", "Non-standard section headings", "ATS maps sections by heading.", odd)
    if bullet_l1.strip() not in ("•", "-", "–", "*", "·"):
        add("ats-bullet-glyph", "minor", "ats", "Unusual bullet symbol", f'"{bullet_l1}" may extract as garbage. Use • or -.')
    if cv.get("profileImage"):
        add("ats-photo", "minor", "ats", "Profile photo included", "Keep it only if the employer asks.", target="personal")

    labelled = [b for b in bullets if LABEL_RE.match(b["text"])]
    ratio = len(labelled) / len(bullets) if bullets else 0
    if len(bullets) >= 4 and ratio >= 0.6:
        add("slop-labels", "major", "slop", f'{round(ratio * 100)}% of bullets start with a "Label:" prefix',
            "Uniform 'Label: verb + object + result' is the clearest generated-text pattern.", [b["text"][:60] for b in labelled[:4]])
    lens = [len(words(t)) for t in texts]
    var = lumpiness(lens)
    if len(bullets) >= 4 and var is not None and var < 0.25:
        add("slop-uniform", "minor", "slop", "Bullets are suspiciously uniform in length", f"Length variation {var} (under 0.25).")
    openers: dict[str, int] = {}
    for t in texts:
        first = (LABEL_RE.sub("", t).split() or [""])[0].lower()
        first = re.sub(r"[^a-zà-ỹ]", "", first)
        if first:
            openers[first] = openers.get(first, 0) + 1
    rep = [f"{w} x{c}" for w, c in openers.items() if c >= 3]
    if rep:
        add("slop-openers", "minor", "slop", "Same opening verb repeated", "Vary verb-first, outcome-first, context-first.", rep)
    low = full.lower()
    hits = [w for w in CLICHES if w in low]
    if hits:
        add("slop-cliche", "major" if len(hits) >= 3 else "minor", "slop", "Generic buzzwords",
            "Replace each with what was actually done, or keep it only next to a concrete fact.", hits)
    weak = [w for w in WEAK if any(w in t.lower() for t in texts)]
    if weak:
        add("slop-weak", "minor", "slop", "Weak ownership verbs", "Name your part instead.", weak)
    dashes = full.count("—")
    if dashes >= 2:
        add("slop-emdash", "minor", "slop", f"{dashes} em-dashes", "Use a period or comma.")
    if intro:
        n, tech = len(words(intro)), len(set(TOOL_RE.findall(intro)))
        if n > 55 or tech > 7:
            add("slop-intro", "minor", "slop", "Objective is long or a keyword list",
                f"{n} words, {tech} tech names. Two lines: role + level + 2-3 technologies + one proof point.", target=intro_key)
    counts: dict[str, int] = {}
    name_parts = set(content_words(cv.get("name", "")))
    for w in content_words(" ".join([intro, *texts])):
        counts[w] = counts.get(w, 0) + 1
    over = sorted(((w, c) for w, c in counts.items() if c >= 5 and len(w) > 4 and w not in name_parts), key=lambda x: -x[1])[:6]
    if over:
        add("slop-repeat", "minor", "slop", "Overused words", "Replace with the specific system, user or result.", [f"{w} x{c}" for w, c in over])
    heavy = [plain(b.get("text", ""))[:60] for e in cv.get("experiences", []) + cv.get("projects", [])
             for b in e.get("bullets", []) if len(re.findall(r"\*\*[^*]+\*\*", b.get("text", ""))) > 2]
    if heavy:
        add("slop-bold", "minor", "slop", "Too much bold", "Bold at most two phrases per bullet.", heavy[:3])
    hits_n = len(TOOL_RE.findall(full)) + len(re.findall(r"\d+", full))
    density = round(100 * hits_n / total_words, 1) if total_words else 0
    if total_words > 80 and density < 10:
        add("slop-density", "major" if density < 6 else "minor", "slop", f"Low specificity: {density} named things per 100 words",
            "Name the system, version, scale.")

    no_num = [b for b in bullets if not re.search(r"\d", b["text"]) and not BEFORE_AFTER_RE.search(b["text"])]
    if len(bullets) >= 4 and len(no_num) / len(bullets) > 0.6:
        add("ev-numbers", "minor", "evidence", f"{len(no_num)}/{len(bullets)} bullets have no number or before/after",
            "Only real numbers. Otherwise describe the concrete change.")
    weakest = sorted(((specificity(b["text"]), b) for b in bullets if specificity(b["text"]) <= 1), key=lambda x: x[0])[:4]
    for i, (sc, b) in enumerate(weakest):
        add(f"ev-weak-{i}", "minor", "evidence", f"Low-information bullet ({sc}/4)",
            "Could it sit unchanged in a stranger's CV? Add what was broken, which tool, what changed.", [b["text"][:110]],
            f"{b['section']}#{b['index']}")
    for i, b in enumerate([b for b in bullets if len(words(b["text"])) > 45][:3]):
        add(f"ev-long-{i}", "minor", "evidence", f"Bullet has {len(words(b['text']))} words", "Split it or cut the tool list.",
            [b["text"][:110]], f"{b['section']}#{b['index']}")
    if "experience" not in disabled:
        exps = cv.get("experiences", [])
        for i, e in enumerate(exps):
            n = len([b for b in e.get("bullets", []) if b.get("type") != "header" and plain(b.get("text", ""))])
            same_org = i > 0 and e.get("company", "").strip().lower() == exps[i - 1].get("company", "").strip().lower() != ""
            if (e.get("company") or e.get("position")) and (n == 0 or n > 6 or (n < 2 and not same_org)):
                add(f"ev-count-{i}", "major" if n == 0 else "minor", "evidence", f"{e.get('company') or e.get('position')}: {n} bullets",
                    "Aim for 3-5 bullets per role (1-2 is fine for an earlier role at the same company).", target=f"experience#{i}")
    if skills_on:
        body = " ".join(texts + context).lower()
        terms = []
        for s in cv.get("skills", []):
            for t in re.split(r"[,;|]", plain(s.get("description", ""))):
                t = re.sub(r"\(.*?\)", "", t).strip()
                if 1 < len(t) < 30 and t not in terms:
                    terms.append(t)
        claimed = [t for t in terms if not has_term(body, t) and not any(len(p.strip()) > 1 and has_term(body, p.strip()) for p in t.split("/"))]
        if claimed:
            add("ev-claimed", "major" if len(claimed) > 8 else "minor", "evidence", f"{len(claimed)} skills are claimed but never shown",
                "Show the important ones in a bullet or drop what you cannot discuss for 5 minutes.", claimed[:14], "skills")

    jd_terms = jd_proven = 0
    jd_table: dict[str, list[str]] = {"proven": [], "claimed": [], "absent": []}
    if jd.strip():
        extra = " ".join(f"{c.get('certName', '')} {c.get('issuer/description', '')}" for c in cv.get("certificates", []))
        extra += " " + " ".join(f"{e.get('degree', '')} {e.get('university', '')}" for e in cv.get("educations", []))
        body = " ".join([intro, *texts, *context, extra])
        for t in jd_terms_of(jd):
            if has_term(body, t):
                jd_table["proven"].append(t)
            elif has_term(skills_text, t):
                jd_table["claimed"].append(t)
            else:
                jd_table["absent"].append(t)
        jd_terms, jd_proven = sum(len(v) for v in jd_table.values()), len(jd_table["proven"])
        if jd_table["absent"]:
            add("jd-missing", "major" if len(jd_table["absent"]) > 6 else "minor", "jd",
                f"{len(jd_table['absent'])} JD terms absent from the CV",
                "Use the JD wording where true. If the user never did it, leave it out; ask before adding.", jd_table["absent"])
        if jd_table["claimed"]:
            add("jd-claimed", "minor", "jd", f"{len(jd_table['claimed'])} JD terms only in Skills",
                "Prove them in a bullet: action + outcome.", jd_table["claimed"], "skills")
        years = [int(y) for y in re.findall(r"(\d{1,2})\s*\+?\s*(?:years?|yrs?|năm)", jd, re.I) if 0 < int(y) < 20]
        if years:
            from datetime import date
            today = (date.today().year, date.today().month)
            have = experience_months(cv, today) / 12
            need = min(years)
            if have + 0.25 < need:
                add("jd-years", "minor", "jd", f"JD asks {need}+ years; CV dates show about {have:.1f}",
                    "State the real span; do not stretch dates. Lead with the strongest relevant evidence instead.")

    order = {"blocker": 0, "major": 1, "minor": 2}
    findings.sort(key=lambda f: order[f["severity"]])
    return {
        "score": max(0, 100 - sum(WEIGHTS[f["severity"]] for f in findings)),
        "findings": findings,
        "stats": {"bullets": len(bullets), "avgWords": round(sum(lens) / len(lens), 1) if lens else 0, "lengthVariation": var,
                  "labelRatio": round(ratio, 2), "noNumber": len(no_num), "density": density, "words": total_words,
                  "jdTerms": jd_terms, "jdProven": jd_proven, "estimatedLines": estimate_lines(data)},
        "jd": jd_table,
    }


# ─── Plain-text view ──────────────────────────────────────────────────────────

def as_text(data: dict) -> str:
    cv = cv_of(data)
    order = data.get("sectionsOrder") or ["objective", "summary", "experience", "projects", "education", "skills", "certificates"]
    disabled = set(data.get("disabledSections", ["summary"]))
    contact = " | ".join(x for x in [cv.get("location"), cv.get("email"), cv.get("phone"),
                                     cv.get("github_placeholder") or cv.get("github"),
                                     cv.get("linkedin_placeholder") or cv.get("linkedin")] if x)
    out = [cv.get("name", ""), contact, ""]
    for sec in order:
        if sec in disabled:
            continue
        if sec in ("objective", "summary") and cv.get(sec):
            out += [sec.upper(), plain(cv[sec]), ""]
        elif sec == "experience" and cv.get("experiences"):
            out.append("EXPERIENCE")
            prev_company = ""
            company_mode = data.get("experienceCompanyMode", "separate-titles")
            for e in cv["experiences"]:
                company = e.get("company", "")
                position = e.get("position", "")
                dates = e.get("dates", "")
                same = bool(company and prev_company.lower() == company.lower())
                if same and company_mode != "single-title":
                    out.append(f"  {position}    {dates}")
                elif not same:
                    out.append(f"{company} | {position}    {dates}")
                bullets = e.get("bullets", [])
                if same and company_mode == "single-title":
                    role_label = " · ".join(x for x in [position, dates] if x)
                    first_detail = next((i for i, b in enumerate(bullets) if b.get("type") != "header" and b.get("text", "").strip()), None)
                    if first_detail is None and role_label:
                        bullets = [*bullets, {"type": "l1", "text": role_label}]
                    elif first_detail is not None:
                        bullets = [dict(b) for b in bullets]
                        bullets[first_detail]["text"] = f"{role_label}: {bullets[first_detail].get('text', '')}"
                out += [("  " if b.get("type") == "header" else "  - ") + plain(b.get("text", "")) for b in bullets]
                prev_company = company
            out.append("")
        elif sec == "projects" and cv.get("projects"):
            out.append("PROJECTS")
            for p in cv["projects"]:
                out.append(p.get("projectName", ""))
                out += ["  - " + plain(b.get("text", "")) for b in p.get("bullets", [])]
            out.append("")
        elif sec == "education" and cv.get("educations"):
            out.append("EDUCATION")
            out += [f"{e.get('university', '')}    {e.get('graduationDate', '')}\n  {e.get('degree', '')}" for e in cv["educations"]]
            out.append("")
        elif sec == "skills" and cv.get("skills"):
            out += ["SKILLS", *[f"{s.get('skill', '')}: {plain(s.get('description', ''))}" for s in cv["skills"]], ""]
        elif sec == "certificates" and cv.get("certificates"):
            out += ["CERTIFICATES", *[f"{c.get('certName', '')}, {c.get('issuer/description', '')}  {c.get('certDate', '')}" for c in cv["certificates"]], ""]
    return "\n".join(out).rstrip() + "\n"


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="cv_tool.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("decode")
    d.add_argument("source", help="#cv= link, a file containing a link or reply, or - for stdin")
    d.add_argument("-o", "--out")
    c = sub.add_parser("check")
    c.add_argument("file")
    c.add_argument("--jd", help="file with the job description text")
    c.add_argument("--pages", type=int, default=0, help="page count, if known")
    c.add_argument("--json", action="store_true")
    for name in ("link", "open"):
        p = sub.add_parser(name)
        p.add_argument("file")
        p.add_argument("--merge", action="store_true")
        p.add_argument("--site", default=SITE)
    sh = sub.add_parser("share")
    sh.add_argument("file")
    sh.add_argument("--site", default=SITE)
    sh.add_argument("--api", default=os.environ.get("CV_EDITOR_SHARE_API_URL", SHARE_API))
    t = sub.add_parser("text")
    t.add_argument("file")
    a = ap.parse_args(argv)

    if a.cmd == "decode":
        if a.source == "-":
            src = sys.stdin.read()
        elif Path(a.source).is_file():
            src = Path(a.source).read_text(encoding="utf-8")
        else:
            src = a.source
        try:
            data = decode_link(src)
        except Exception as e:  # corrupted or truncated link, or text without a payload
            print(f"error: could not decode a CV payload ({type(e).__name__}: {e}). "
                  "The link may be cut off; ask for the full link or the JSON block.", file=sys.stderr)
            return 2
        out = json.dumps(data, ensure_ascii=False, indent=2)
        if a.out:
            Path(a.out).write_text(out + "\n", encoding="utf-8")
            print(f"wrote {a.out}")
        else:
            print(out)
        return 0

    data = load(a.file)
    if a.cmd == "share":
        link, expires_at = create_share_link(data, a.site, a.api)
        print(link)
        if expires_at:
            expiry = datetime.fromtimestamp(expires_at / 1000, tz=timezone.utc).isoformat()
            print(f"Short share link expires at {expiry} UTC (3 days). Anyone with the link can view this CV.", file=sys.stderr)
        else:
            print("Share Worker unavailable; returned a self-contained offline preview link instead.", file=sys.stderr)
        return 0
    if a.cmd == "check":
        jd = Path(a.jd).read_text(encoding="utf-8") if a.jd else ""
        r = audit(data, jd, a.pages)
        if a.json:
            print(json.dumps(r, ensure_ascii=False, indent=2))
        else:
            s = r["stats"]
            print(f"score {r['score']}/100 | bullets {s['bullets']} | avg {s['avgWords']}w | variation {s['lengthVariation']} | "
                  f"Label: {round(s['labelRatio'] * 100)}% | no number {s['noNumber']} | density {s['density']}/100w"
                  + (f" | JD proven {s['jdProven']}/{s['jdTerms']}" if s["jdTerms"] else ""))
            if r["jd"]["proven"] or r["jd"]["claimed"] or r["jd"]["absent"]:
                print("JD coverage")
                for k in ("proven", "claimed", "absent"):
                    print(f"  {k:8} {', '.join(r['jd'][k]) or '-'}")
            print(f"estimated length: ~{s['estimatedLines']} lines (about 62 fit on one page)")
            for f in r["findings"]:
                where = f" [{f['target']}]" if f["target"] else ""
                print(f"- {f['severity'].upper()} {f['category']}: {f['title']}{where}")
                print(f"    {f['detail']}")
                for q in f["quotes"][:8]:
                    print(f"    > {q}")
            if not r["findings"]:
                print("No findings. Still read it once as a recruiter would.")
        return 1 if any(f["severity"] == "blocker" for f in r["findings"]) else 0
    if a.cmd in ("link", "open"):
        link = encode_link(data, a.site, a.merge)
        print(link)
        if a.cmd == "open":
            webbrowser.open(link)
        return 0
    if a.cmd == "text":
        print(as_text(data), end="")
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
