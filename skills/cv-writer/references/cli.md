# CLI handoff

Coding agents with a shell can use the bundled JavaScript CLI:

```bash
node <skill>/scripts/fynx-cv.mjs decode "<preview-link>"
node <skill>/scripts/fynx-cv.mjs validate content.json
node <skill>/scripts/fynx-cv.mjs create content.json --output cv.pdf
node <skill>/scripts/fynx-cv.mjs create content.json --config config.json --output cv.pdf
node <skill>/scripts/fynx-cv.mjs link content.json
node <skill>/scripts/fynx-cv.mjs link content.json --config config.json
node <skill>/scripts/fynx-cv.mjs share content.json --config config.json
node <skill>/scripts/fynx-cv.mjs audit content.json --jd job-description.txt
```

`--config` is optional but, if present, must be complete. `audit` is a static heuristic and should be used when the user requests a quality/ATS review. It cannot verify truth. It checks project context, dates, technology lines and reverse-chronological order alongside ATS and bullet evidence. `link` and `share` create a short Worker preview URL, with a compressed offline fallback if the Worker is unavailable. The CLI accepts old combined JSON as a migration path.

The Worker stores the compressed CV for three days; anyone with the link can view it until expiry. This is the normal preview-link path because it avoids URL length limits. Configure another Worker endpoint with `--api` or `CV_EDITOR_SHARE_API_URL`.

After finalizing the CV, run `link` and return its exact stdout URL with the JSON. If the Worker fallback warning appears, identify the URL as an offline fallback. Do not substitute the blank website URL.
