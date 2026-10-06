import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from "./provider";

export class MockTranslationProvider implements TranslationProvider {
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    return {
      paragraphs: request.paragraphs.map(
        (paragraph) => `[TRANSLATED] ${paragraph}`,
      ),
    };
  }
}
