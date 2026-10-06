import {
  activeTab,
  openOptionsPage,
  runtimeSendMessage,
  sendToTab,
} from "../browser/compat";
import type {
  RuntimeCommand,
  RuntimeResponse,
  TabCommand,
  TabResponse,
} from "../browser/messages";

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const providerStatus =
  document.querySelector<HTMLParagraphElement>("#provider-status")!;
const privacyNote = document.querySelector<HTMLElement>("#privacy-note")!;
const error = document.querySelector<HTMLParagraphElement>("#error")!;
const translateButton =
  document.querySelector<HTMLButtonElement>("#translate")!;
const originalButton = document.querySelector<HTMLButtonElement>("#original")!;
const settingsButton = document.querySelector<HTMLButtonElement>("#settings")!;

type GoodTabStatus = Extract<TabResponse, { ok: true }>;
type GoodProviderStatus = Extract<
  RuntimeResponse,
  { ok: true; type: "provider-status" }
>;

let tabId: number | undefined;
let tabState: GoodTabStatus | undefined;
let providerState: GoodProviderStatus | undefined;
let busy = false;
let displayedError: string | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;

function render(): void {
  error.hidden = !displayedError;
  error.textContent = displayedError ?? "";
  providerStatus.textContent = providerState
    ? `Provider: ${providerState.provider === "mock" ? "Mock" : "OpenRouter"}`
    : "";
  privacyNote.textContent =
    providerState?.provider === "openrouter"
      ? "Chapter text goes directly to OpenRouter when you translate."
      : "Mock translation stays in your browser.";

  const translating = busy || tabState?.translating === true;
  if (translating) {
    status.textContent = "Translating…";
  } else if (displayedError) {
    status.textContent = "Error";
  } else if (!tabState?.supported) {
    status.textContent = "This page is not a supported Wattpad chapter.";
  } else if (tabState.translated) {
    status.textContent = "Translation complete";
  } else if (!providerState?.ready) {
    status.textContent = providerState?.issue ?? "Check your Settings.";
  } else {
    status.textContent = "Ready";
  }

  translateButton.disabled =
    translating ||
    !tabState?.supported ||
    tabState.translated ||
    !providerState?.ready;
  originalButton.disabled = translating || !tabState?.translated;
  if (tabState?.translating && !busy && tabId !== undefined && !pollTimer) {
    pollTimer = setTimeout(() => void pollChapterStatus(), 750);
  }
}

async function pollChapterStatus(): Promise<void> {
  pollTimer = undefined;
  if (busy || tabId === undefined || !tabState?.translating) return;
  try {
    const response = await sendToTab<TabResponse>(tabId, {
      type: "status",
    } satisfies TabCommand);
    if (response?.ok) {
      tabState = response;
      displayedError = response.error;
    } else {
      displayedError = response?.error ?? "Could not read this chapter.";
      tabState = undefined;
    }
  } catch {
    displayedError =
      "Could not reach the Wattpad tab. Reload it and try again.";
    tabState = undefined;
  }
  render();
}

async function refresh(): Promise<void> {
  try {
    const command: RuntimeCommand = { type: "provider-status" };
    const response = await runtimeSendMessage<RuntimeResponse>(command);
    if (!response?.ok) {
      throw new Error(response?.error ?? "Could not read provider settings.");
    }
    if (response.type !== "provider-status") {
      throw new Error("Could not read provider settings.");
    }
    providerState = response;
    const tab = await activeTab();
    if (!tab.url || !/^https:\/\/(?:www\.)?wattpad\.com\//.test(tab.url)) {
      tabState = undefined;
      render();
      return;
    }
    tabId = tab.id;
    const tabResponse = await sendToTab<TabResponse>(tabId!, {
      type: "status",
    } satisfies TabCommand);
    if (!tabResponse?.ok)
      throw new Error(tabResponse?.error ?? "Could not read this chapter.");
    tabState = tabResponse;
    displayedError = tabResponse.error;
  } catch {
    displayedError =
      "Could not reach the extension or Wattpad tab. Reload both and try again.";
  }
  render();
}

async function run(command: TabCommand): Promise<void> {
  if (tabId === undefined) return;
  busy = true;
  displayedError = undefined;
  render();
  try {
    const response = await sendToTab<TabResponse>(tabId, command);
    if (!response?.ok) {
      displayedError = response?.error ?? "The chapter did not respond.";
    } else {
      tabState = response;
      displayedError = response.error;
    }
  } catch {
    displayedError =
      "Could not reach the Wattpad tab. Reload it and try again.";
  } finally {
    busy = false;
    render();
  }
}

translateButton.addEventListener(
  "click",
  () => void run({ type: "translate" }),
);
originalButton.addEventListener(
  "click",
  () => void run({ type: "show-original" }),
);
settingsButton.addEventListener("click", () => {
  void openOptionsPage().catch(() => {
    displayedError = "Could not open LinguaLoom Settings.";
    render();
  });
});

void refresh();
