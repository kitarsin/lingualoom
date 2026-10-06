import { UserFacingError } from "../user-facing-error";

export type ProviderId = "mock" | "openrouter";
export type TranslationMode = "literary";

export interface Settings {
  provider: ProviderId;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  mode: TranslationMode;
  rememberKey: boolean;
}

export const defaultSettings: Settings = {
  provider: "mock",
  model: "",
  sourceLanguage: "Auto",
  targetLanguage: "English",
  mode: "literary",
  rememberKey: false,
};

export function normalizeSettings(value: unknown): Settings {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    provider: input.provider === "openrouter" ? "openrouter" : "mock",
    model: typeof input.model === "string" ? input.model : "",
    sourceLanguage:
      typeof input.sourceLanguage === "string" ? input.sourceLanguage : "Auto",
    targetLanguage:
      typeof input.targetLanguage === "string"
        ? input.targetLanguage
        : "English",
    mode: "literary",
    rememberKey: input.rememberKey === true,
  };
}

export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== "object")
    throw new UserFacingError("Settings are invalid.");
  const input = value as Record<string, unknown>;
  if (input.provider !== "mock" && input.provider !== "openrouter") {
    throw new UserFacingError("Choose Mock or OpenRouter as the provider.");
  }
  if (input.mode !== "literary")
    throw new UserFacingError("Choose Literary mode.");
  if (typeof input.rememberKey !== "boolean") {
    throw new UserFacingError(
      "Choose whether to remember the API key locally.",
    );
  }
  const model = validateText(input.model, "Model", 160, false);
  if (input.provider === "openrouter" && !model) {
    throw new UserFacingError("Enter an OpenRouter model identifier.");
  }
  if (model && /\s/.test(model)) {
    throw new UserFacingError("Model identifiers cannot contain spaces.");
  }
  return {
    provider: input.provider,
    model,
    sourceLanguage: validateText(
      input.sourceLanguage,
      "Source language",
      80,
      true,
    ),
    targetLanguage: validateText(
      input.targetLanguage,
      "Target language",
      80,
      true,
    ),
    mode: "literary",
    rememberKey: input.rememberKey,
  };
}

function validateText(
  value: unknown,
  label: string,
  maxLength: number,
  required: boolean,
): string {
  if (typeof value !== "string")
    throw new UserFacingError(`${label} is invalid.`);
  const text = value.trim();
  if ((required && !text) || text.length > maxLength || /[\r\n]/.test(text)) {
    throw new UserFacingError(`Enter a valid ${label.toLowerCase()}.`);
  }
  return text;
}

export function validateApiKey(value: string): string {
  const key = value.trim();
  if (!key || key.length > 512 || /\s/.test(key)) {
    throw new UserFacingError("Enter a valid OpenRouter API key.");
  }
  return key;
}
