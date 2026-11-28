# CLI handoff

Coding agents with a shell can use the bundled JavaScript CLI:

```bash
node <skill>/scripts/fynx-cv.mjs validate content.json
node <skill>/scripts/fynx-cv.mjs create content.json --output cv.pdf
node <skill>/scripts/fynx-cv.mjs create content.json --config config.json --output cv.pdf
node <skill>/scripts/fynx-cv.mjs link content.json
node <skill>/scripts/fynx-cv.mjs link content.json --config config.json
node <skill>/scripts/fynx-cv.mjs audit content.json --jd job-description.txt
```

`--config` is optional but, if present, must be complete. `audit` is a static heuristic and should be used when the user requests a quality/ATS review. It cannot verify truth. `link` packs content and config into a preview URL. The CLI accepts old combined JSON as a migration path.

After finalizing the CV, run `link` and return its exact stdout URL with the JSON. It opens the exact content and format config in website preview mode; do not substitute the blank website URL.
