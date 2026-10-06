import type { SettingsStore } from "../settings/settings-store";
import { UserFacingError } from "../user-facing-error";
import { MockTranslationProvider } from "./mock-translation-provider";
import { OpenRouterTranslationProvider } from "./openrouter-translation-provider";
import type { TranslationProvider } from "./provider";

export async function createProvider(
  store: SettingsStore,
  fetchImpl: typeof fetch = fetch,
): Promise<TranslationProvider> {
  const settings = await store.getSettings();
  if (settings.provider === "mock") return new MockTranslationProvider();
  if (!settings.model.trim()) {
    throw new UserFacingError(
      "Enter an OpenRouter model identifier in Settings.",
    );
  }
  const apiKey = await store.getApiKey();
  if (!apiKey) {
    throw new UserFacingError("Add your OpenRouter API key in Settings.");
  }
  return new OpenRouterTranslationProvider(settings, apiKey, fetchImpl);
}
