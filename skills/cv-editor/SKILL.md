---
name: cv-editor
description: Compatibility entry for older CV Editor agents. Use the newer cv-writer skill for CV and cover-letter writing.
---

# CV Editor compatibility

Use `cv-writer` as the main workflow. It keeps content and formatting in separate JSON files, supports the website and CLI, and loads domain skills only as needed. Run `cv-slop-review` only when the user explicitly requests a wording or ATS review.

Older combined JSON and `#cv=` links still import into the website. Short `?cv=<id>` Worker links also import and can be read with `python <skill>/scripts/cv_tool.py decode "<preview-link>"`. For new work, follow `https://cv-editor.fynx.io.vn/llms.txt` and install `https://cv-editor.fynx.io.vn/fynx-cv-writer-skill.zip`. To share a preview, use the CLI `link` command or the editor's **More → Copy share link** action; avoid manually creating long JSON URLs. The short link lasts three days.
