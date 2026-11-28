# Website handoff

Open `https://cv-editor.fynx.io.vn/`. Paste `content.json` into the import dialog or anywhere outside an input. A separate `config.json` can be imported as a merge. The app has separate **Content JSON** and **Format config JSON** exports.

Create an exact preview link after writing the CV. Prefer the short Worker-backed link because a large CV can exceed URL limits or fail to open when its JSON is placed in the fragment.

- With a shell, run `node <skill>/scripts/fynx-cv.mjs link content.json [--config config.json]` and return its URL verbatim. `link` and `share` both try the Share Worker first, store the CV for three days, and return a short URL; anyone with the URL can view it during that period.
- With the website, import the exact content JSON and optional complete format config, then choose **More → Copy share link**. Return the copied URL. The editor uses the same short-link service.
- If the Worker is unavailable, CLI and website fall back to a compressed offline URL. Say that it is the offline fallback; avoid generating a manually encoded JSON URL. If that fallback is too long to use, provide the JSON and ask the user to import it in the editor.

The short link opens the exact CV in preview mode with an Edit button. If the final answer also includes a PDF, only say it was rendered when the renderer actually ran.
