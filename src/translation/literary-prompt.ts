import type { Settings } from "../settings/settings";
import { UserFacingError } from "../user-facing-error";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export function buildLiteraryPrompt(
  settings: Pick<Settings, "sourceLanguage" | "targetLanguage" | "mode">,
  paragraphs: string[],
): ChatMessage[] {
  if (settings.mode !== "literary")
    throw new UserFacingError("Unsupported translation mode.");
  const source =
    settings.sourceLanguage.toLowerCase() === "auto"
      ? "Detect the source language"
      : `Source language: ${settings.sourceLanguage}`;

  return [
    {
      role: "system",
      content:
        "Translate literary fiction. Preserve meaning, prose style, narrative voice, dialogue style, characterization, emotional intensity, and paragraph structure. Use natural target-language prose without unnecessary literalism. Do not summarize, add information, censor, embellish, or continue the story. Return only a JSON object with a paragraphs array containing the translated text, in the same order and count; no notes or other text.",
    },
    {
      role: "user",
      content: `${source}. Target language: ${settings.targetLanguage}. Translate these paragraphs in order:\n${JSON.stringify(paragraphs)}`,
    },
  ];
}
