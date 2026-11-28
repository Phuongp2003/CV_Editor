# Formatting config

`config.json` is optional. The CLI has a built-in default. If a file is passed with `--config`, it **replaces the whole default** and must provide every field. Layout and section order are invalid here.

```json
{
  "template": "modern",
  "language": "English",
  "sizeMultiplier": 1,
  "selectedFont": "garamond",
  "customFontName": "",
  "experienceHeaderStyle": "classic",
  "bulletChars": { "l1": "•", "l2": "◦", "l3": "▪" },
  "avatarStyle": { "shape": "rounded", "position": "left", "size": "md", "fit": "cover" }
}
```

`sizeMultiplier` scales body size `B` from 10.5 pt in 0.5 pt steps, clamped to 9.5–11.5 pt. The name uses `1.7 × B`, section headings use `1.15 × B`, contact details use `B - 0.5 pt`, and line height uses `B + 2 pt`. Vertical spacing keeps 10–14 pt before sections, 3–5 pt between the rule and body text, 6–8 pt between entries, and 1.5–3 pt between bullets. Harvard headings are uppercase; Modern keeps its v1.0.1 sentence-case style.

`template`, `selectedFont`, and `experienceHeaderStyle` default to the v1.0.1 PDF style (`modern`, `garamond`, and `classic`). EB Garamond is the default; `notosans` embeds the original Calibri font asset. `arial`, `times`, and `custom` remain available. Keep `sectionLabels`, `sectionsOrder`, and `disabledSections` in `content.json` under `layout`.
