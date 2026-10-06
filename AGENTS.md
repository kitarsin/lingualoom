# Repository Guidelines

## Project Structure & Module Organization

LinguaLoom is a WebExtension for Wattpad. `src/popup/` and `src/options/` contain extension UI; `src/browser/` isolates browser API calls; `src/sites/` extracts chapter text; `src/content/` manages page state; `src/settings/` owns configuration and credentials; `src/translation/` holds providers and prompts; and `src/background/` handles runtime requests. Tests live in `tests/`. `scripts/build.mjs` produces `dist/firefox/` and `dist/chromium/` from `manifest.common.json`.

Keep Wattpad selectors in its adapter and add future sites separately. Keep provider networking behind `TranslationProvider`; content scripts must not contain provider API code.

## Build, Test, and Development Commands

Use Node.js 20 or newer. Run `npm ci` for locked dependencies. `npm run build` generates both targets; `npm run build:firefox` and `npm run build:chromium` generate one. Run `npm run lint` and `npm test` before submitting. `npm run format` applies Prettier. Reload the extension and Wattpad tab after a build; see `README.md`.

## Coding Style & Naming Conventions

Write TypeScript with two-space indentation and Prettier formatting. Use `kebab-case` file names, `PascalCase` for classes and interfaces, and `camelCase` for functions and variables. Keep modules small and browser checks inside `src/browser/`. Avoid replacing Wattpad story DOM wholesale; preserve original nodes and content so users can switch views safely.

## Testing Guidelines

Use Node's test runner with `tsx` and `jsdom`. Name files `*.test.ts`. Mock `fetch` for provider tests; never make paid API calls in automated tests. Check adapter selection, prompt and response validation, runtime messages, media preservation, and exact original restoration.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, capitalized subjects, such as `Correct capitalization of project name in README`. Keep commits focused. Pull requests should explain user impact, link relevant issues, list validation, and include screenshots or a short recording for popup or page UI changes.

## Security & Configuration

Never commit API keys, tokens, browser profiles, `.env` files, `node_modules/`, or generated `dist/`. Keep keys in extension storage and out of Wattpad DOM, messages to content scripts, logs, and errors. Provider requests belong in the background context. `storage.local` is not encrypted; users must opt into remembering a key there. Keep permissions narrow and document changes.
