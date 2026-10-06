import { onMessage } from "../browser/compat";
import type { Command, CommandResponse } from "../browser/messages";
import { WattpadAdapter } from "../sites/wattpad-adapter";
import { MockTranslationProvider } from "../translation/mock-translation-provider";
import { ChapterView } from "./chapter-view";

const view = new ChapterView(
  document,
  new WattpadAdapter(),
  new MockTranslationProvider(),
);

onMessage((message, _sender, sendResponse) => {
  const command = message as Command;
  if (!["status", "translate", "show-original"].includes(command?.type)) return;

  void (async (): Promise<CommandResponse> => {
    const url = new URL(document.location.href);
    if (command.type === "translate") await view.translate(url);
    if (command.type === "show-original") view.showOriginal();
    return { ok: true, ...view.status(url) };
  })()
    .then(sendResponse)
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );

  // Returning true keeps the message channel open in both browsers.
  return true;
});
