import type { Settings } from "../settings/settings";
import { UserFacingError } from "../user-facing-error";
import { buildLiteraryPrompt } from "./literary-prompt";
import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from "./provider";

const baseUrl = "https://openrouter.ai/api/v1";
export const maxChapterCharacters = 12_000;
const requestTimeoutMs = 25_000;

export function parseOpenRouterResponse(
  value: unknown,
  expectedCount: number,
): TranslationResult {
  if (!value || typeof value !== "object")
    throw new UserFacingError("OpenRouter returned an invalid response.");
  const choices = (value as { choices?: unknown }).choices;
  if (
    !Array.isArray(choices) ||
    !choices[0] ||
    typeof choices[0] !== "object"
  ) {
    throw new UserFacingError("OpenRouter returned an invalid response.");
  }
  const choice = choices[0] as {
    finish_reason?: unknown;
    message?: { content?: unknown };
  };
  if (choice.finish_reason === "length") {
    throw new UserFacingError(
      "The model stopped before finishing. Try a shorter chapter.",
    );
  }
  if (typeof choice.message?.content !== "string") {
    throw new UserFacingError("OpenRouter returned no translated text.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(choice.message.content.trim());
  } catch {
    throw new UserFacingError(
      "The model did not return valid paragraph data. Try again or choose another model.",
    );
  }
  const paragraphs =
    parsed && typeof parsed === "object"
      ? (parsed as { paragraphs?: unknown }).paragraphs
      : null;
  if (
    !Array.isArray(paragraphs) ||
    paragraphs.length !== expectedCount ||
    paragraphs.some(
      (paragraph) => typeof paragraph !== "string" || !paragraph.trim(),
    )
  ) {
    throw new UserFacingError(
      "The model returned the wrong number of paragraphs. No page content was changed.",
    );
  }
  return { paragraphs };
}

export function openRouterHttpError(status: number): Error {
  if (status === 401 || status === 403)
    return new UserFacingError(
      "OpenRouter rejected the API key. Check it in Settings.",
    );
  if (status === 402)
    return new UserFacingError(
      "OpenRouter reports insufficient credits for this request.",
    );
  if (status === 404)
    return new UserFacingError(
      "OpenRouter could not find that model identifier.",
    );
  if (status === 408 || status === 504)
    return new UserFacingError("OpenRouter timed out. Try again later.");
  if (status === 413)
    return new UserFacingError(
      "This chapter is too large for one request. Chunking is planned for Milestone 3.",
    );
  if (status === 429)
    return new UserFacingError(
      "OpenRouter rate limit reached. Try again later.",
    );
  if (status >= 500)
    return new UserFacingError(
      "OpenRouter is temporarily unavailable. Try again later.",
    );
  return new UserFacingError(
    `OpenRouter rejected the request (HTTP ${status}). Check the model and settings.`,
  );
}

export class OpenRouterTranslationProvider implements TranslationProvider {
  constructor(
    private readonly settings: Settings,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const characters = request.paragraphs.reduce(
      (total, paragraph) => total + paragraph.length,
      0,
    );
    if (characters > maxChapterCharacters) {
      throw new UserFacingError(
        "This chapter is too large for one request. Chunking is planned for Milestone 3.",
      );
    }
    const response = await this.request(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: buildLiteraryPrompt(this.settings, request.paragraphs),
        stream: false,
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    return parseOpenRouterResponse(body, request.paragraphs.length);
  }

  async testConnection(): Promise<void> {
    await this.request(`${baseUrl}/key`, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      let response: Response;
      try {
        // Native browser fetch expects the Window/Worker global as its receiver.
        response = await this.fetchImpl.call(globalThis, url, {
          ...init,
          signal: controller.signal,
          redirect: "manual",
        });
      } catch {
        if (controller.signal.aborted)
          throw new UserFacingError(
            "OpenRouter took too long to respond. Try a shorter chapter or faster model.",
          );
        throw new UserFacingError(
          "Could not reach OpenRouter. Check your connection and try again.",
        );
      }
      if (
        response.type === "opaqueredirect" ||
        (response.status >= 300 && response.status < 400)
      ) {
        throw new UserFacingError(
          "OpenRouter redirected the request, so LinguaLoom stopped to protect your key and chapter text.",
        );
      }
      if (!response.ok) throw openRouterHttpError(response.status);
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
