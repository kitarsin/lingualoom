import type { SiteAdapter } from "./site-adapter";

const chapterContainers = [
  '[data-testid="story-part-content"]',
  ".part-content-new",
  ".part-content",
  ".story-part-content",
  ".reader-content",
  ".page .text",
];

// A translated text-only <p> would hide media or links nested in the original.
// Leave those paragraphs in Wattpad's DOM until the renderer can preserve them.
const embeddedContent =
  "a[href], img, picture, video, audio, iframe, embed, object, canvas, svg, figure";

function isVisible(element: HTMLElement): boolean {
  for (
    let current: HTMLElement | null = element;
    current;
    current = current.parentElement
  ) {
    if (current.hidden || current.getAttribute("aria-hidden") === "true")
      return false;
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (
      (style?.display === "none" &&
        !current.hasAttribute("data-lingualoom-original-hidden")) ||
      style?.visibility === "hidden"
    )
      return false;
  }
  return true;
}

export class WattpadAdapter implements SiteAdapter {
  isSupported(url: URL, document: Document): boolean {
    if (!["wattpad.com", "www.wattpad.com"].includes(url.hostname))
      return false;
    // Wattpad story overview URLs start with /story/; chapter reader URLs start with a part ID.
    if (!/^\/\d+(?:-[^/]*)?\/?$/.test(url.pathname)) return false;
    return this.getParagraphs(document).length > 0;
  }

  getParagraphs(document: Document): HTMLElement[] {
    for (const selector of chapterContainers) {
      const containers = [...document.querySelectorAll<HTMLElement>(selector)];
      const paragraphs = containers.flatMap((container) =>
        [...container.querySelectorAll<HTMLElement>("p")].filter(
          (paragraph) =>
            !paragraph.hasAttribute("data-lingualoom-translation") &&
            !paragraph.closest(
              'button, [role="button"], [contenteditable="true"]',
            ) &&
            !paragraph.querySelector(embeddedContent) &&
            paragraph.textContent?.trim() &&
            isVisible(paragraph),
        ),
      );
      if (paragraphs.length > 0) return [...new Set(paragraphs)];
    }
    return [];
  }
}
