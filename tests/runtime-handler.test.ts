import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeHandler } from "../src/background/runtime-handler";
import type { RuntimeCommand } from "../src/browser/messages";
import { defaultSettings } from "../src/settings/settings";
import { SettingsStore } from "../src/settings/settings-store";
import type { StorageArea } from "../src/settings/settings-store";
import { MockTranslationProvider } from "../src/translation/mock-translation-provider";
import { OpenRouterTranslationProvider } from "../src/translation/openrouter-translation-provider";
import { createProvider } from "../src/translation/provider-factory";

class MemoryArea implements StorageArea {
  private values = new Map<string, unknown>();

  async get(key: string): Promise<Record<string, unknown>> {
    return { [key]: this.values.get(key) };
  }
  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items))
      this.values.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function store(): SettingsStore {
  return new SettingsStore(new MemoryArea(), new MemoryArea());
}

const chapterSender = {
  id: "lingualoom-test",
  url: "https://www.wattpad.com/123456789-chapter",
  tab: { url: "https://www.wattpad.com/123456789-chapter" },
};
const optionsSender = {
  id: "lingualoom-test",
  url: "moz-extension://test/options.html",
  tab: { url: "moz-extension://test/options.html" },
};
const popupSender = {
  id: "lingualoom-test",
  url: "moz-extension://test/popup.html",
};
const chromiumOptionsSender = {
  id: "lingualoom-test",
  url: "chrome-extension://lingualoom-test/options.html",
  tab: { url: "chrome-extension://lingualoom-test/options.html" },
};

test("selects the Mock provider by default and handles typed messages", async () => {
  const settings = store();
  assert.ok(
    (await createProvider(settings)) instanceof MockTranslationProvider,
  );
  const handle = createRuntimeHandler(settings, "lingualoom-test");
  assert.deepEqual(await handle({ type: "provider-status" }, popupSender), {
    ok: true,
    type: "provider-status",
    provider: "mock",
    ready: true,
  });
  assert.deepEqual(
    await handle(
      { type: "translate-paragraphs", paragraphs: ["Hola"] },
      chapterSender,
    ),
    {
      ok: true,
      type: "translation",
      result: { paragraphs: ["[TRANSLATED] Hola"] },
    },
  );
  assert.deepEqual(await handle({ type: "test-connection" }, optionsSender), {
    ok: true,
    type: "connection",
    message: "Mock provider is ready.",
  });
  assert.deepEqual(
    await handle({ type: "test-connection" }, chromiumOptionsSender),
    { ok: true, type: "connection", message: "Mock provider is ready." },
  );
});

test("rejects unauthorized or malformed content-script requests", async () => {
  const handle = createRuntimeHandler(store(), "lingualoom-test");
  const payload: RuntimeCommand = {
    type: "translate-paragraphs",
    paragraphs: ["Hola"],
  };
  const foreign = await handle(payload, {
    ...chapterSender,
    id: "foreign-extension",
  });
  assert.equal(foreign.ok, false);
  const wrongSite = await handle(payload, {
    ...chapterSender,
    url: "https://example.com/123-chapter",
  });
  assert.equal(wrongSite.ok, false);
  const malformed = await handle(
    { type: "translate-paragraphs", paragraphs: [] },
    chapterSender,
  );
  assert.equal(malformed.ok, false);
  const contentTryingSettings = await handle(
    { type: "test-connection" },
    chapterSender,
  );
  assert.equal(contentTryingSettings.ok, false);
});

test("OpenRouter selection requires model and key, then routes through mock fetch", async () => {
  const settings = store();
  await settings.save({
    ...defaultSettings,
    provider: "openrouter",
    model: "example/model",
  });
  const handle = createRuntimeHandler(settings, "lingualoom-test");
  const missingKey = await handle({ type: "provider-status" }, popupSender);
  assert.equal(missingKey.ok, true);
  if (missingKey.ok && missingKey.type === "provider-status") {
    assert.equal(missingKey.ready, false);
    assert.match(missingKey.issue ?? "", /API key/);
  }
  await settings.save(
    { ...defaultSettings, provider: "openrouter", model: "example/model" },
    "test-key",
  );
  assert.ok(
    (await createProvider(settings, async () => new Response("{}"))) instanceof
      OpenRouterTranslationProvider,
  );

  const paths: string[] = [];
  const fakeFetch: typeof fetch = async (url) => {
    paths.push(String(url));
    if (String(url).endsWith("/key"))
      return new Response("{}", { status: 200 });
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: { content: '{"paragraphs":["Hello"]}' },
          },
        ],
      }),
      { status: 200 },
    );
  };
  const routed = createRuntimeHandler(settings, "lingualoom-test", fakeFetch);
  assert.deepEqual(await routed({ type: "test-connection" }, optionsSender), {
    ok: true,
    type: "connection",
    message:
      "OpenRouter accepted the API key. The model is checked when translating.",
  });
  assert.deepEqual(
    await routed(
      { type: "translate-paragraphs", paragraphs: ["Hola"] },
      chapterSender,
    ),
    { ok: true, type: "translation", result: { paragraphs: ["Hello"] } },
  );
  assert.deepEqual(paths, [
    "https://openrouter.ai/api/v1/key",
    "https://openrouter.ai/api/v1/chat/completions",
  ]);
});

test("reports missing OpenRouter host access before sending a request", async () => {
  const settings = store();
  await settings.save(
    { ...defaultSettings, provider: "openrouter", model: "example/model" },
    "test-key",
  );
  let called = false;
  const fetchImpl: typeof fetch = async () => {
    called = true;
    throw new Error("Network should not be called");
  };
  const handle = createRuntimeHandler(
    settings,
    "lingualoom-test",
    fetchImpl,
    async () => false,
  );
  const status = await handle({ type: "provider-status" }, popupSender);
  assert.equal(status.ok, true);
  if (status.ok && status.type === "provider-status") {
    assert.equal(status.ready, false);
    assert.match(status.issue ?? "", /extension permissions/);
  }
  const response = await handle({ type: "test-connection" }, optionsSender);
  assert.equal(response.ok, false);
  if (!response.ok) assert.match(response.error, /extension permissions/);
  assert.equal(called, false);
});
