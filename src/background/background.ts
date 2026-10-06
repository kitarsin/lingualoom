import {
  extensionId,
  hasOpenRouterAccess,
  onMessage,
  storageArea,
} from "../browser/compat";
import type { RuntimeCommand } from "../browser/messages";
import { SettingsStore } from "../settings/settings-store";
import { createRuntimeHandler } from "./runtime-handler";

const store = new SettingsStore(storageArea("local"), storageArea("session"));
const handle = createRuntimeHandler(
  store,
  extensionId(),
  fetch,
  hasOpenRouterAccess,
);
const commands = new Set([
  "translate-paragraphs",
  "provider-status",
  "test-connection",
]);

onMessage((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  const type = (message as { type?: unknown }).type;
  if (typeof type !== "string" || !commands.has(type)) return;
  void handle(message as RuntimeCommand, sender)
    .then(sendResponse)
    .catch(() =>
      sendResponse({
        ok: false,
        error: "LinguaLoom could not complete the request.",
      }),
    );
  return true;
});
