# Repository Guidelines

## Project Structure & Module Organization

LinguaLoom is a WebExtensions MVP for Wattpad. `src/popup/` contains the toolbar UI; `src/browser/` isolates browser API calls; `src/sites/` owns site detection and paragraph extraction; `src/translation/` holds the provider contract and mock provider; and `src/content/` manages page state. DOM tests live in `tests/`. `scripts/build.mjs` combines `manifest.common.json` with browser-specific metadata to produce `dist/firefox/` and `dist/chromium/`.

Keep Wattpad selectors in its adapter. Add future sites as separate adapters. Keep provider-specific logic behind `TranslationProvider`; the popup and chapter view should not depend on a particular AI service.

## Build, Test, and Development Commands

Use Node.js 20 or newer. Run `npm ci` to install locked dependencies. `npm run build` generates both extension targets; `npm run build:firefox` and `npm run build:chromium` generate one. Run `npm run typecheck`, `npm test`, and `npm run lint` before opening a pull request. `npm run format` applies Prettier. Reload the extension and the Wattpad tab after a build; see `README.md` for browser-specific steps.

## Coding Style & Naming Conventions

Write TypeScript with two-space indentation and Prettier formatting. Use `kebab-case` file names, `PascalCase` for classes and interfaces, and `camelCase` for functions and variables. Keep modules small and browser checks inside `src/browser/`. Avoid replacing Wattpad story DOM wholesale; preserve original nodes and content so users can switch views safely.

## Testing Guidelines

Use Node's test runner with `tsx` and `jsdom`. Name files `*.test.ts`. Test adapter URL and DOM selection separately from translation behavior. For view changes, check that mock output appears, unsupported UI is untouched, repeated toggles work, and original markup returns exactly. Run `npm test` and `npm run build` before submitting.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, capitalized subjects, such as `Correct capitalization of project name in README`. Keep commits focused. Pull requests should explain user impact, link relevant issues, list validation, and include screenshots or a short recording for popup or page UI changes.

## Security & Configuration

This milestone has no API integration or credential storage. Never commit API keys, tokens, browser profiles, `.env` files, `node_modules/`, or generated `dist/` output. Keep extension permissions narrow and explain additions in the pull request.
