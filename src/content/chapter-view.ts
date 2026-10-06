import type { SiteAdapter } from "../sites/site-adapter";
import type { TranslationProvider } from "../translation/provider";

interface TranslationPair {
  original: HTMLElement;
  translated: HTMLElement;
  previousHiddenAttribute: string | null;
}

export class ChapterView {
  private pairs: TranslationPair[] = [];
  private translatedUrl: string | null = null;
  private revision = 0;
  private translating = false;
  private lastError: string | undefined;
  private lastErrorUrl: string | undefined;

  constructor(
    private readonly document: Document,
    private readonly adapter: SiteAdapter,
    private readonly provider: TranslationProvider,
  ) {}

  status(url: URL): {
    supported: boolean;
    translated: boolean;
    translating: boolean;
    error?: string;
  } {
    this.resetIfPageChanged(url);
    return {
      supported: this.adapter.isSupported(url, this.document),
      translated: this.pairs.length > 0,
      translating: this.translating,
      ...(this.lastError && this.lastErrorUrl === url.href
        ? { error: this.lastError }
        : {}),
    };
  }

  async translate(url: URL): Promise<void> {
    this.resetIfPageChanged(url);
    if (!this.adapter.isSupported(url, this.document)) {
      throw new Error("Open a supported Wattpad chapter first.");
    }
    if (this.pairs.length > 0) return;
    if (this.translating)
      throw new Error("Translation is already in progress.");

    const paragraphs = this.adapter.getParagraphs(this.document);
    const originals = paragraphs.map(
      (paragraph) => paragraph.textContent ?? "",
    );
    const revision = this.revision;
    this.translating = true;
    this.lastError = undefined;
    this.lastErrorUrl = undefined;
    try {
      const result = await this.provider.translate({ paragraphs: originals });
      if (result.paragraphs.length !== paragraphs.length) {
        throw new Error(
          "The translation did not match the chapter paragraphs.",
        );
      }
      if (
        this.revision !== revision ||
        this.document.location.href !== url.href ||
        paragraphs.some(
          (paragraph, index) =>
            !paragraph.isConnected ||
            paragraph.textContent !== originals[index],
        )
      ) {
        throw new Error("The chapter changed during translation. Try again.");
      }

      for (const [index, original] of paragraphs.entries()) {
        const translated = this.document.createElement("p");
        translated.className = original.className;
        translated.setAttribute("data-lingualoom-translation", "");
        translated.textContent = result.paragraphs[index];
        const previousHiddenAttribute = original.getAttribute(
          "data-lingualoom-original-hidden",
        );
        original.after(translated);
        original.setAttribute("data-lingualoom-original-hidden", "");
        this.pairs.push({ original, translated, previousHiddenAttribute });
      }
      this.translatedUrl = url.href;
    } catch (error) {
      this.lastError =
        error instanceof Error
          ? error.message
          : "Translation failed. Try again.";
      this.lastErrorUrl = url.href;
      throw error;
    } finally {
      this.translating = false;
    }
  }

  showOriginal(): void {
    this.revision += 1;
    this.lastError = undefined;
    this.lastErrorUrl = undefined;
    for (const { original, translated, previousHiddenAttribute } of this
      .pairs) {
      translated.remove();
      if (previousHiddenAttribute === null) {
        original.removeAttribute("data-lingualoom-original-hidden");
      } else {
        original.setAttribute(
          "data-lingualoom-original-hidden",
          previousHiddenAttribute,
        );
      }
    }
    this.pairs = [];
    this.translatedUrl = null;
  }

  private resetIfPageChanged(url: URL): void {
    if (
      this.translatedUrl &&
      (this.translatedUrl !== url.href ||
        this.pairs.some(({ original }) => !original.isConnected))
    ) {
      this.showOriginal();
    }
  }
}
