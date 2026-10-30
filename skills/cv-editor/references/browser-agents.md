# Driving the CV Editor page from a browser

Use this only when you control a browser. Otherwise use `scripts/cv_tool.py`.

Open https://cv-editor.fynx.io.vn/ (or a `#cv=` link) and wait for the API:

```js
await new Promise(r => { const t = setInterval(() => window.cvEditor && (clearInterval(t), r()), 100) })
```

| Call | Effect |
|---|---|
| `cvEditor.load(payload)` | Replace the whole CV. Accepts an object or a JSON string (code fences allowed). |
| `cvEditor.patch(partial)` | Merge: any `cv` field you send replaces the current one; arrays are replaced, not merged. |
| `cvEditor.undo()` | Revert the last load or patch. |
| `cvEditor.audit(jdText?)` | `{ score, findings[], stats }`, the same check as `cv_tool.py check`. |
| `cvEditor.pageCount()` | Pages of the rendered PDF. Read it about 1 s after a change. |
| `await cvEditor.pdfBase64()` | The current PDF, if you need to save it yourself. |
| `cvEditor.downloadPdf()` | Trigger the browser download. |
| `await cvEditor.shareLink()` | Compact link that reproduces this CV. |
| `cvEditor.getState()` | Full current state (same shape as the payload). |

Data stays in the user's browser (localStorage). Do not navigate away from a page with unsaved work the user did not ask you to replace; use `patch` for small edits and tell the user they can undo.
