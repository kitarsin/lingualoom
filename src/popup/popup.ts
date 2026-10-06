import { activeTab, sendToTab } from "../browser/compat";
import type { Command, CommandResponse } from "../browser/messages";

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const error = document.querySelector<HTMLParagraphElement>("#error")!;
const translateButton =
  document.querySelector<HTMLButtonElement>("#translate")!;
const originalButton = document.querySelector<HTMLButtonElement>("#original")!;

let tabId: number | undefined;

function display(response: CommandResponse): void {
  if (!response.ok) {
    error.textContent = response.error;
    error.hidden = false;
    return;
  }
  error.hidden = true;
  status.textContent = response.supported
    ? response.translated
      ? "Supported Wattpad chapter · Mock translation shown"
      : "Supported Wattpad chapter"
    : "This page is not a supported Wattpad chapter.";
  translateButton.disabled = !response.supported || response.translated;
  originalButton.disabled = !response.translated;
}

async function run(command: Command): Promise<void> {
  if (tabId === undefined) return;
  translateButton.disabled = true;
  originalButton.disabled = true;
  error.hidden = true;
  try {
    display(await sendToTab<CommandResponse>(tabId, command));
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : String(cause);
    error.hidden = false;
    status.textContent =
      "Cannot reach this page. Reload the Wattpad tab and try again.";
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

void activeTab()
  .then((tab) => {
    if (!tab.url || !/^https:\/\/(?:www\.)?wattpad\.com\//.test(tab.url)) {
      status.textContent = "This page is not a supported Wattpad chapter.";
      return;
    }
    tabId = tab.id;
    return run({ type: "status" });
  })
  .catch(() => {
    status.textContent = "This page is not a supported Wattpad chapter.";
  });
