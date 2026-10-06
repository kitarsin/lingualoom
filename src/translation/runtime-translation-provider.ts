import { runtimeSendMessage } from "../browser/compat";
import type { RuntimeCommand, RuntimeResponse } from "../browser/messages";
import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from "./provider";

export class RuntimeTranslationProvider implements TranslationProvider {
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const message: RuntimeCommand = {
      type: "translate-paragraphs",
      paragraphs: request.paragraphs,
    };
    const response = await runtimeSendMessage<RuntimeResponse>(message);
    if (!response || !response.ok) {
      throw new Error(
        response?.error ?? "The translation runtime did not respond.",
      );
    }
    if (response.type !== "translation") {
      throw new Error("The translation runtime returned an invalid response.");
    }
    return response.result;
  }
}
