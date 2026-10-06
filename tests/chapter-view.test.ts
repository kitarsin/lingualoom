import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { ChapterView } from "../src/content/chapter-view";
import { WattpadAdapter } from "../src/sites/wattpad-adapter";
import { MockTranslationProvider } from "../src/translation/mock-translation-provider";
import type {
  TranslationProvider,
  TranslationResult,
} from "../src/translation/provider";

const chapterUrl = new URL("https://www.wattpad.com/123456789-example-chapter");

function chapter() {
  const dom = new JSDOM(
    `<header><p>Wattpad controls</p></header>
     <div class="part-content-new">
       <p id="first">No <em>quería</em> volver a casa.</p>
       <p id="second">“Hola”, dijo ella.</p>
     </div>
     <aside><p>Reader comment</p></aside>`,
    { url: chapterUrl.href },
  );
  return dom.window.document;
}

test("mock translation toggles repeatedly without changing original content or unrelated UI", async () => {
  const document = chapter();
  const first = document.querySelector<HTMLElement>("#first")!;
  const originalHtml = first.innerHTML;
  const unrelatedHtml = document.querySelector("header")!.innerHTML;
  const view = new ChapterView(
    document,
    new WattpadAdapter(),
    new MockTranslationProvider(),
  );

  await view.translate(chapterUrl);
  assert.deepEqual(view.status(chapterUrl), {
    supported: true,
    translated: true,
    translating: false,
  });
  assert.equal(first.innerHTML, originalHtml);
  assert.equal(
    first.nextElementSibling?.textContent,
    "[TRANSLATED] No quería volver a casa.",
  );
  assert.equal(
    document.querySelectorAll("[data-lingualoom-translation]").length,
    2,
  );

  await view.translate(chapterUrl);
  assert.equal(
    document.querySelectorAll("[data-lingualoom-translation]").length,
    2,
  );

  view.showOriginal();
  assert.deepEqual(view.status(chapterUrl), {
    supported: true,
    translated: false,
    translating: false,
  });
  assert.equal(first.innerHTML, originalHtml);
  assert.equal(
    document.querySelectorAll("[data-lingualoom-translation]").length,
    0,
  );
  assert.equal(document.querySelector("header")!.innerHTML, unrelatedHtml);

  await view.translate(chapterUrl);
  view.showOriginal();
  assert.equal(first.innerHTML, originalHtml);
});

test("invalid provider output leaves original paragraphs untouched", async () => {
  const document = chapter();
  const originalHtml = document.querySelector(".part-content-new")!.innerHTML;
  const invalidProvider: TranslationProvider = {
    async translate() {
      return { paragraphs: [] };
    },
  };
  const view = new ChapterView(document, new WattpadAdapter(), invalidProvider);

  await assert.rejects(view.translate(chapterUrl), /did not match/);
  assert.match(view.status(chapterUrl).error ?? "", /did not match/);
  assert.equal(
    document.querySelector(".part-content-new")!.innerHTML,
    originalHtml,
  );
});

test("reports in-progress translation and rejects a duplicate request", async () => {
  const document = chapter();
  let finish!: (result: TranslationResult) => void;
  const provider: TranslationProvider = {
    translate: () =>
      new Promise<TranslationResult>((resolve) => (finish = resolve)),
  };
  const view = new ChapterView(document, new WattpadAdapter(), provider);
  const pending = view.translate(chapterUrl);

  assert.equal(view.status(chapterUrl).translating, true);
  await assert.rejects(view.translate(chapterUrl), /already in progress/);
  finish({ paragraphs: ["Hello", "Hello again"] });
  await pending;
  assert.equal(view.status(chapterUrl).translating, false);
  assert.equal(view.status(chapterUrl).translated, true);
});

test("keeps embedded photos and linked videos visible while translating prose", async () => {
  const document = new JSDOM(
    `<div class="part-content-new">
       <p id="prose">No quería volver a casa.</p>
       <p id="photo">A memory <img src="memory.jpg" alt="A family photo"></p>
       <p id="video">Watch the scene: <a href="https://www.youtube.com/watch?v=example">video</a></p>
       <p id="embed">Listen <iframe src="https://www.youtube.com/embed/example"></iframe></p>
       <p id="ending">Luego se fue.</p>
     </div>`,
    { url: chapterUrl.href },
  ).window.document;
  const view = new ChapterView(
    document,
    new WattpadAdapter(),
    new MockTranslationProvider(),
  );
  const media = ["#photo", "#video", "#embed"].map((selector) =>
    document.querySelector<HTMLElement>(selector)!,
  );
  const originalMarkup = media.map((paragraph) => paragraph.innerHTML);

  await view.translate(chapterUrl);
  assert.equal(
    document.querySelectorAll("[data-lingualoom-translation]").length,
    2,
  );
  for (const [index, paragraph] of media.entries()) {
    assert.equal(
      paragraph.hasAttribute("data-lingualoom-original-hidden"),
      false,
    );
    assert.equal(paragraph.innerHTML, originalMarkup[index]);
  }

  view.showOriginal();
  for (const [index, paragraph] of media.entries()) {
    assert.equal(paragraph.innerHTML, originalMarkup[index]);
  }
});
