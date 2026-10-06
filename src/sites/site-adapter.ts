export interface SiteAdapter {
  isSupported(url: URL, document: Document): boolean;
  getParagraphs(document: Document): HTMLElement[];
}
