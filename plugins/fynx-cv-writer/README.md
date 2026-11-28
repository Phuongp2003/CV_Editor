# Fynx CV writer

An agent-first CV and cover-letter writing plugin for Codex, ChatGPT, and compatible agents. It produces content JSON separately from formatting config, supports reusable and custom sections, and includes a local CLI renderer. Domain guidance and optional CV slop review are separate skills.

The writer returns the final content JSON and an exact preview link containing that CV. The link opens Fynx CV in preview mode; it does not upload the CV to a server.

## Install from the GitHub marketplace

```bash
codex plugin marketplace add Phuongp2003/CV_Editor@feature/fynx-cv-plugin-web-installer
codex plugin add fynx-cv-writer@fynx-cv-tools
```

For ChatGPT web, a workspace admin can import the repository marketplace from **Admin Console → Plugins → Add → Import marketplace** using `https://github.com/Phuongp2003/CV_Editor` as the source and `feature/fynx-cv-plugin-web-installer` as the branch. Alternatively, an eligible admin can upload this plugin ZIP.

## Use the CLI

The plugin includes `skills/cv-writer/scripts/fynx-cv.mjs`. Give an agent `content.json` and, optionally, a complete replacement `config.json`:

```bash
node skills/cv-writer/scripts/fynx-cv.mjs validate content.json
node skills/cv-writer/scripts/fynx-cv.mjs create content.json --config config.json --output cv.pdf
node skills/cv-writer/scripts/fynx-cv.mjs link content.json --config config.json
```

Omit `--config` to use the built-in format defaults. The config controls visual formatting; CV content and section layout stay in the content JSON. See the skill references for schemas and authoring rules.

This marketplace distributes only the generic `Fynx CV writer` plugin. Phuong's personal `Fynx CV` plugin and candidate fact bank are not included.
