# LinguaLoom

LinguaLoom is an open-source browser extension for literary translation of web fiction. This first milestone supports Wattpad chapter pages and uses a **mock translator only**. It does not call an AI provider, collect API keys, or run a backend. The mock output adds `[TRANSLATED] ` to each extracted story paragraph.

## Requirements and commands

Use Node.js 20 or newer and npm. From the repository root:

```sh
npm ci                  # install dependencies from package-lock.json
npm run build           # build both browser targets
npm run build:firefox   # build dist/firefox only
npm run build:chromium  # build dist/chromium only
npm run typecheck       # check TypeScript
npm test                # run DOM-focused unit tests
npm run lint            # typecheck and check formatting
npm run format          # format source and documentation
```

After changing source, rebuild and reload the extension in your browser. The output directories are disposable generated files.

## Load in Firefox or Floorp

1. Run `npm ci` and `npm run build:firefox`.
2. Open `about:debugging#/runtime/this-firefox` in Firefox or Floorp.
3. Select **Load Temporary Add-on** and choose `dist/firefox/manifest.json`.
4. Open or reload a Wattpad chapter tab, then open LinguaLoom from the toolbar.

Temporary add-ons disappear when the browser closes. After rebuilding, use **Reload** on the add-on's `about:debugging` card and reload the Wattpad tab.

## Load in Chrome or another Chromium browser

1. Run `npm ci` and `npm run build:chromium`.
2. Open the browser's extensions page (for Chrome, `chrome://extensions`; for Brave, `brave://extensions`; for Edge, `edge://extensions`).
3. Enable **Developer mode**, select **Load unpacked**, and choose the `dist/chromium` directory.
4. Open or reload a Wattpad chapter tab, then open LinguaLoom from the toolbar.

After rebuilding, click **Reload** on the extension card and reload the Wattpad tab.

## Try the MVP

On a real Wattpad chapter page, the popup should say the page is supported when the chapter body is available. Click **Translate Chapter** and confirm each story paragraph starts with `[TRANSLATED] `. Wattpad navigation, comments, and controls should remain unchanged. Click **Show Original** and confirm the exact original prose and inline formatting return. Repeat the toggle, reopen the popup, and try a story overview or unrelated site; those pages should be reported as unsupported.

Wattpad can change its page structure. If a real chapter is reported as unsupported or non-story text is selected, capture the chapter URL and relevant DOM structure for an adapter update.

## Code layout

`src/popup/` holds the extension UI, `src/browser/` holds cross-browser messaging, `src/sites/` holds the Wattpad detection and extraction adapter, `src/translation/` defines the provider interface and mock provider, and `src/content/` manages the original and translated views. `scripts/build.mjs` generates separate Manifest V3 outputs from `manifest.common.json`. The Firefox manifest adds its required Gecko metadata; neither target needs a background process for this milestone. The only API permission is `activeTab`, which lets the popup identify the tab after the user opens it.
