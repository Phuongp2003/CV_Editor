# Website handoff

Open `https://cv-editor.fynx.io.vn/`. Paste `content.json` into the import dialog or anywhere outside an input. A separate `config.json` can be imported as a merge. The app has separate **Content JSON** and **Format config JSON** exports.

For one-click preview, create a URL whose fragment is the raw-deflate-compressed, base64url-encoded UTF-8 JSON bundle `{"content": <content.json>, "config": <complete config or default>}`:

`https://cv-editor.fynx.io.vn/?view=preview#cv=z:<encoded>`

Fragments are not sent to the server. The page opens in preview mode and has an Edit button. A ChatGPT web skill that cannot run compression should output one valid `content.json` block and instruct the user to paste it; do not fabricate a link or PDF.
