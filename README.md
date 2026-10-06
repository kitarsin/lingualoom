# LinguaLoom

LinguaLoom is an open-source WebExtension for literary translation of Wattpad chapters. It offers a local Mock provider and a bring-your-own-key OpenRouter provider. LinguaLoom does not supply API access or operate a backend server.

## Build and check

Use Node.js 20 or newer and npm:

```sh
npm ci                  # install locked development dependencies
npm run build           # build both browser targets
npm run build:firefox   # build dist/firefox
npm run build:chromium  # build dist/chromium
npm run lint            # TypeScript and formatting checks
npm test                # automated tests; no paid API calls
```

Rebuild after source changes, then reload the extension and Wattpad tab.

## Set up OpenRouter

1. Create your own key in [OpenRouter Keys](https://openrouter.ai/settings/keys). Provider usage is billed or limited by OpenRouter according to your account and chosen model.
2. Find a model on [OpenRouter Models](https://openrouter.ai/models) and copy its exact identifier, such as `provider/model-name`. LinguaLoom does not browse models automatically.
3. Open the LinguaLoom popup and click **Settings**. Choose **OpenRouter**, paste the key, enter the model identifier, and set the languages. Source defaults to **Auto**, target to **English**, and mode to **Literary**.
4. Leave **Remember key locally** unchecked to keep the key only for this browser session, or check it to retain the key on this device. Click **Save Settings**, then **Test Connection**. The test checks the saved key without making a paid translation request; the chosen model is checked when you translate.

The key field is blank when Settings reopens, even if a key is saved. A blank field on Save keeps the existing key. Use **Remove Key** to delete it. Select **Mock** when you want to test the extension without contacting an AI provider.

If the popup reports missing access to `openrouter.ai`, grant LinguaLoom that site permission in your browser's extension manager and retry **Test Connection**. If a request still fails, check that OpenRouter is reachable in the same browser and inspect the extension's background console; never include your API key in a bug report. LinguaLoom refuses redirects so a key or chapter text cannot be forwarded to another site by the provider request.

## Translate a chapter

Open a Wattpad chapter, click the LinguaLoom toolbar button, and select **Translate Chapter**. The popup shows **Ready**, **Translating…**, **Translation complete**, or an error. **Show Original** restores the original paragraph nodes and formatting. Paragraphs containing images, embedded media, or links remain in their original form so that media stays usable.

This milestone sends text-only story paragraphs in one request. Chapters over 12,000 input characters receive a clear size error; intelligent chunking is planned for Milestone 3. Slow OpenRouter responses may time out after 25 seconds. A model may have tighter limits than this extension's guard.

## Load in Firefox or Floorp

1. Run `npm ci` and `npm run build:firefox`.
2. Open `about:debugging#/runtime/this-firefox` in Firefox or Floorp.
3. Select **Load Temporary Add-on** and choose `dist/firefox/manifest.json`.
4. Open or reload a Wattpad chapter tab, then open LinguaLoom from the toolbar.

After rebuilding, use **Reload** on the add-on's `about:debugging` card and reload the Wattpad tab. Temporary add-ons disappear when the browser closes.

## Load in Chrome or another Chromium browser

1. Run `npm ci` and `npm run build:chromium`.
2. Open the browser's extensions page (`chrome://extensions` in Chrome, `brave://extensions` in Brave, or `edge://extensions` in Edge).
3. Enable **Developer mode**, select **Load unpacked**, and choose `dist/chromium`.
4. Open or reload a Wattpad chapter tab, then open LinguaLoom from the toolbar.

After rebuilding, click **Reload** on the extension card and reload the Wattpad tab.

## Privacy and architecture

When OpenRouter is selected and you click Translate, the extension sends extracted story text directly from your browser to OpenRouter over HTTPS. **Test Connection** sends the key to OpenRouter's key endpoint but no chapter text. Mock mode makes no provider requests. The Wattpad page and content script never receive the API key; provider requests run in an extension background context. The key is stored only in extension-controlled `storage.session` by default or, with your explicit choice, `storage.local`. Local browser storage is not encrypted and cannot protect a key from someone who controls your device or browser profile. No key or chapter text is logged by LinguaLoom.

`src/sites/` owns Wattpad extraction, `src/content/` manages the original and translated views, `src/translation/` contains provider implementations and prompting, `src/settings/` handles configuration, `src/background/` performs provider requests, and `src/browser/` isolates WebExtensions API differences. The build emits a Firefox event page and a Chromium service worker from the same TypeScript source.
