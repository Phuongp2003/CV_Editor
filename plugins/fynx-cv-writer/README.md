# Fynx CV writer

An agent-first CV and cover-letter writing plugin for Codex and compatible agents. It produces content JSON separately from formatting config, supports reusable and custom sections, and includes a local CLI renderer. Domain guidance and optional CV slop review are separate skills.

## Install from this marketplace

```bash
codex plugin marketplace add Phuongp2003/CV_Editor
codex plugin add fynx-cv-writer@fynx-cv-tools
```

Restart Codex after installing the plugin.

## Use the CLI

The plugin includes `skills/cv-writer/scripts/fynx-cv.mjs`. Give an agent `content.json` and, optionally, a complete replacement `config.json`:

```bash
node skills/cv-writer/scripts/fynx-cv.mjs validate content.json
node skills/cv-writer/scripts/fynx-cv.mjs create content.json --config config.json --output cv.pdf
```

Omit `--config` to use the built-in format defaults. The config controls visual formatting; CV content and section layout stay in the content JSON. See the skill references for schemas and authoring rules.

This marketplace distributes only the generic `Fynx CV writer` plugin. Phuong's personal `Fynx CV` plugin and candidate fact bank are not included.
