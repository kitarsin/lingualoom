import { runtimeSendMessage, storageArea } from "../browser/compat";
import type { RuntimeCommand, RuntimeResponse } from "../browser/messages";
import { SettingsStore } from "../settings/settings-store";
import type { Settings } from "../settings/settings";
import { UserFacingError, userFacingMessage } from "../user-facing-error";

const store = new SettingsStore(storageArea("local"), storageArea("session"));
const form = document.querySelector<HTMLFormElement>("#settings-form")!;
const provider = document.querySelector<HTMLSelectElement>("#provider")!;
const openRouterFields =
  document.querySelector<HTMLFieldSetElement>("#openrouter-fields")!;
const apiKey = document.querySelector<HTMLInputElement>("#api-key")!;
const keyStatus = document.querySelector<HTMLParagraphElement>("#key-status")!;
const model = document.querySelector<HTMLInputElement>("#model")!;
const rememberKey = document.querySelector<HTMLInputElement>("#remember-key")!;
const sourceLanguage =
  document.querySelector<HTMLInputElement>("#source-language")!;
const targetLanguage =
  document.querySelector<HTMLInputElement>("#target-language")!;
const mode = document.querySelector<HTMLSelectElement>("#mode")!;
const saveButton = document.querySelector<HTMLButtonElement>("#save")!;
const testButton = document.querySelector<HTMLButtonElement>("#test")!;
const removeKeyButton =
  document.querySelector<HTMLButtonElement>("#remove-key")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const error = document.querySelector<HTMLParagraphElement>("#error")!;

let dirty = false;
let busy = false;
let hasKey = false;

function render(): void {
  openRouterFields.disabled = provider.value !== "openrouter";
  keyStatus.textContent = hasKey
    ? dirty
      ? "A key is saved. Save changes to update its storage choice."
      : rememberKey.checked
        ? "A key is remembered locally."
        : "A key is available for this browser session."
    : "No API key saved.";
  saveButton.disabled = busy;
  testButton.disabled = busy || dirty;
  removeKeyButton.disabled = busy || !hasKey;
}

function showError(cause: unknown): void {
  error.textContent = userFacingMessage(cause);
  error.hidden = false;
  status.textContent = "";
}

function currentSettings(): Settings {
  return {
    provider: provider.value as Settings["provider"],
    model: model.value,
    sourceLanguage: sourceLanguage.value,
    targetLanguage: targetLanguage.value,
    mode: mode.value as Settings["mode"],
    rememberKey: rememberKey.checked,
  };
}

async function load(): Promise<void> {
  try {
    const saved = await store.getPublicSettings();
    provider.value = saved.settings.provider;
    model.value = saved.settings.model;
    sourceLanguage.value = saved.settings.sourceLanguage;
    targetLanguage.value = saved.settings.targetLanguage;
    mode.value = saved.settings.mode;
    rememberKey.checked = saved.settings.rememberKey;
    hasKey = saved.hasKey;
    dirty = false;
    render();
  } catch {
    showError(new UserFacingError("Settings could not be loaded."));
  }
}

form.addEventListener("input", () => {
  dirty = true;
  render();
});
form.addEventListener("change", () => {
  dirty = true;
  render();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    busy = true;
    error.hidden = true;
    render();
    try {
      await store.save(currentSettings(), apiKey.value);
      apiKey.value = "";
      const saved = await store.getPublicSettings();
      hasKey = saved.hasKey;
      dirty = false;
      status.textContent = "Settings saved.";
    } catch (cause) {
      showError(cause);
    } finally {
      busy = false;
      render();
    }
  })();
});

testButton.addEventListener("click", () => {
  void (async () => {
    busy = true;
    error.hidden = true;
    status.textContent = "Testing connection…";
    render();
    try {
      const command: RuntimeCommand = { type: "test-connection" };
      const response = await runtimeSendMessage<RuntimeResponse>(command);
      if (!response?.ok) {
        error.textContent =
          response?.error ?? "The extension runtime did not respond.";
        error.hidden = false;
        status.textContent = "";
      } else if (response.type === "connection") {
        status.textContent = response.message;
      } else {
        status.textContent = "";
        showError(
          new UserFacingError(
            "The extension runtime returned an invalid response.",
          ),
        );
      }
    } catch {
      showError(new UserFacingError("Could not reach the extension runtime."));
    } finally {
      busy = false;
      render();
    }
  })();
});

removeKeyButton.addEventListener("click", () => {
  void (async () => {
    busy = true;
    error.hidden = true;
    render();
    try {
      await store.removeApiKey();
      apiKey.value = "";
      hasKey = false;
      status.textContent = "OpenRouter API key removed.";
    } catch {
      showError(new UserFacingError("The API key could not be removed."));
    } finally {
      busy = false;
      render();
    }
  })();
});

void load();
