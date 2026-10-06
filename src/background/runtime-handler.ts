import type { MessageSender } from "../browser/compat";
import type { RuntimeCommand, RuntimeResponse } from "../browser/messages";
import type { SettingsStore } from "../settings/settings-store";
import { UserFacingError, userFacingMessage } from "../user-facing-error";
import { OpenRouterTranslationProvider } from "../translation/openrouter-translation-provider";
import { createProvider } from "../translation/provider-factory";
import type { TranslationProvider } from "../translation/provider";

function isWattpadChapterSender(sender: MessageSender): boolean {
  if (!sender.tab) return false;
  try {
    const url = new URL(sender.url ?? sender.tab.url ?? "");
    return (
      url.protocol === "https:" &&
      ["wattpad.com", "www.wattpad.com"].includes(url.hostname) &&
      /^\/\d+(?:-[^/]*)?\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function isExtensionPageSender(
  sender: MessageSender,
  page: "popup" | "options",
): boolean {
  try {
    const url = new URL(sender.url ?? "");
    return (
      ["moz-extension:", "chrome-extension:"].includes(url.protocol) &&
      url.pathname === `/${page}.html`
    );
  } catch {
    return false;
  }
}

function validParagraphs(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (paragraph) => typeof paragraph === "string" && paragraph.trim(),
    )
  );
}

export function createRuntimeHandler(
  store: SettingsStore,
  extensionId: string,
  fetchImpl: typeof fetch = fetch,
  hasProviderAccess: () => Promise<boolean> = async () => true,
) {
  async function requireProviderAccess(
    provider: TranslationProvider,
  ): Promise<void> {
    if (
      provider instanceof OpenRouterTranslationProvider &&
      !(await hasProviderAccess())
    ) {
      throw new UserFacingError(
        "Allow LinguaLoom access to openrouter.ai in your browser's extension permissions, then try again.",
      );
    }
  }
  return async (
    message: RuntimeCommand,
    sender: MessageSender,
  ): Promise<RuntimeResponse> => {
    if (sender.id !== extensionId) {
      return { ok: false, error: "This extension message was not authorized." };
    }
    try {
      if (message.type === "translate-paragraphs") {
        if (
          !isWattpadChapterSender(sender) ||
          !validParagraphs(message.paragraphs)
        ) {
          throw new UserFacingError("Open a supported Wattpad chapter first.");
        }
        const provider = await createProvider(store, fetchImpl);
        await requireProviderAccess(provider);
        const result = await provider.translate({
          paragraphs: message.paragraphs,
        });
        return { ok: true, type: "translation", result };
      }
      if (message.type === "provider-status") {
        if (!isExtensionPageSender(sender, "popup")) {
          throw new UserFacingError(
            "Open the LinguaLoom popup to use this action.",
          );
        }
        const settings = await store.getSettings();
        if (settings.provider === "mock") {
          return {
            ok: true,
            type: "provider-status",
            provider: "mock",
            ready: true,
          };
        }
        let issue = !settings.model.trim()
          ? "Enter an OpenRouter model identifier in Settings."
          : !(await store.getApiKey())
            ? "Add your OpenRouter API key in Settings."
            : undefined;
        if (!issue && !(await hasProviderAccess())) {
          issue =
            "Allow LinguaLoom access to openrouter.ai in your browser's extension permissions.";
        }
        return {
          ok: true,
          type: "provider-status",
          provider: "openrouter",
          ready: !issue,
          issue,
        };
      }
      if (message.type === "test-connection") {
        if (!isExtensionPageSender(sender, "options")) {
          throw new UserFacingError(
            "Open LinguaLoom Settings to use this action.",
          );
        }
        const provider = await createProvider(store, fetchImpl);
        await requireProviderAccess(provider);
        if (provider instanceof OpenRouterTranslationProvider) {
          await provider.testConnection();
          return {
            ok: true,
            type: "connection",
            message:
              "OpenRouter accepted the API key. The model is checked when translating.",
          };
        }
        return {
          ok: true,
          type: "connection",
          message: "Mock provider is ready.",
        };
      }
      throw new UserFacingError("Unknown LinguaLoom command.");
    } catch (error) {
      return { ok: false, error: userFacingMessage(error) };
    }
  };
}
