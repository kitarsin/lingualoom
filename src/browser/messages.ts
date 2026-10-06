import type { ProviderId } from "../settings/settings";
import type { TranslationResult } from "../translation/provider";

export type TabCommand = { type: "status" | "translate" | "show-original" };

export type TabResponse =
  | {
      ok: true;
      supported: boolean;
      translated: boolean;
      translating: boolean;
      error?: string;
    }
  | { ok: false; error: string };

export type RuntimeCommand =
  | { type: "translate-paragraphs"; paragraphs: string[] }
  | { type: "provider-status" }
  | { type: "test-connection" };

export type RuntimeResponse =
  | { ok: true; type: "translation"; result: TranslationResult }
  | {
      ok: true;
      type: "provider-status";
      provider: ProviderId;
      ready: boolean;
      issue?: string;
    }
  | { ok: true; type: "connection"; message: string }
  | { ok: false; error: string };
