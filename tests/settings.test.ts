import assert from "node:assert/strict";
import test from "node:test";
import { defaultSettings, validateSettings } from "../src/settings/settings";
import { SettingsStore } from "../src/settings/settings-store";
import type { StorageArea } from "../src/settings/settings-store";

class MemoryArea implements StorageArea {
  readonly values = new Map<string, unknown>();

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

test("validates OpenRouter settings and defaults to Mock", async () => {
  const store = new SettingsStore(new MemoryArea(), new MemoryArea());
  assert.deepEqual(await store.getPublicSettings(), {
    settings: defaultSettings,
    hasKey: false,
  });
  assert.throws(
    () => validateSettings({ ...defaultSettings, provider: "openrouter" }),
    /model identifier/,
  );
  assert.throws(
    () => validateSettings({ ...defaultSettings, targetLanguage: "" }),
    /target language/,
  );
  assert.throws(
    () => validateSettings({ ...defaultSettings, model: "bad model" }),
    /spaces/,
  );
});

test("keeps a session key by default and moves it only when explicitly remembered", async () => {
  const local = new MemoryArea();
  const session = new MemoryArea();
  const store = new SettingsStore(local, session);
  const settings = {
    ...defaultSettings,
    provider: "openrouter" as const,
    model: "example/model",
  };

  await store.save(settings, " secret-key ");
  assert.equal(session.values.get("openrouterApiKey"), "secret-key");
  assert.equal(local.values.has("openrouterApiKey"), false);
  assert.equal((await store.getPublicSettings()).hasKey, true);

  await store.save({ ...settings, rememberKey: true });
  assert.equal(local.values.get("openrouterApiKey"), "secret-key");
  assert.equal(session.values.has("openrouterApiKey"), false);

  await store.save({ ...settings, rememberKey: false });
  assert.equal(session.values.get("openrouterApiKey"), "secret-key");
  assert.equal(local.values.has("openrouterApiKey"), false);

  await store.removeApiKey();
  assert.equal((await store.getPublicSettings()).hasKey, false);
  assert.equal(await store.getApiKey(), undefined);
});

test("does not store a malformed key", async () => {
  const local = new MemoryArea();
  const session = new MemoryArea();
  const store = new SettingsStore(local, session);
  await assert.rejects(
    store.save(defaultSettings, "contains spaces"),
    /valid OpenRouter API key/,
  );
  assert.equal(local.values.has("openrouterApiKey"), false);
  assert.equal(session.values.has("openrouterApiKey"), false);
});
