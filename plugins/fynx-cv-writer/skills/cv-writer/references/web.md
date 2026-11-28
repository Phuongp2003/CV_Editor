# Website handoff

Open `https://cv-editor.fynx.io.vn/`. Paste `content.json` into the import dialog or anywhere outside an input. A separate `config.json` can be imported as a merge. The app has separate **Content JSON** and **Format config JSON** exports.

After writing the final CV, create a one-click preview link that contains that exact CV. If the user supplied a formatting config, include the complete config. Without one, omit `config` and let the website use its current defaults. The site accepts an uncompressed, URL-encoded JSON handoff, so a web-only agent does not need shell access:

```js
const payload = { content: contentJson }
if (configJson) payload.config = configJson
const link = `https://cv-editor.fynx.io.vn/?view=preview#cv=${encodeURIComponent(JSON.stringify(payload))}`
```

Percent-encode the complete UTF-8 JSON payload, then return the actual resulting URL alongside the final JSON. Do not return the template above, a generic link to the site, or a URL that does not contain the final CV. For a shell agent, use `node <skill>/scripts/fynx-cv.mjs link content.json [--config config.json]` to create a shorter compressed link; return the CLI output verbatim.

Fragments are not sent to the server. The page opens in preview mode and has an Edit button. If the final answer also includes a PDF, only say it was rendered when the renderer actually ran.
