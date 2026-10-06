export interface TranslationRequest {
  paragraphs: string[];
}

export interface TranslationResult {
  paragraphs: string[];
}

export interface TranslationProvider {
  translate(request: TranslationRequest): Promise<TranslationResult>;
}
