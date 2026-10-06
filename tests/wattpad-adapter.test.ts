import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { WattpadAdapter } from "../src/sites/wattpad-adapter";

const chapterUrl = "https://www.wattpad.com/123456789-example-chapter";

test("recognizes a chapter with visible story paragraphs only", () => {
  const dom = new JSDOM(
    `<main>
      <p>Navigation text</p>
      <div class="part-content-new">
        <p>First paragraph</p>
        <p hidden>Hidden draft</p>
        <p style="display:none">Hidden text</p>
        <p>Second paragraph</p>
      </div>
      <p>Comments and controls</p>
    </main>`,
    { url: chapterUrl },
  );
  const adapter = new WattpadAdapter();
  const document = dom.window.document;

  assert.equal(adapter.isSupported(new URL(chapterUrl), document), true);
  assert.deepEqual(
    adapter.getParagraphs(document).map((paragraph) => paragraph.textContent),
    ["First paragraph", "Second paragraph"],
  );
  assert.equal(
    adapter.isSupported(
      new URL("https://www.wattpad.com/story/123-example"),
      document,
    ),
    false,
  );
  assert.equal(
    adapter.isSupported(
      new URL("https://example.com/123456789-example"),
      document,
    ),
    false,
  );
});

test("rejects a chapter URL without a known story container", () => {
  const document = new JSDOM("<main><p>Unrelated text</p></main>", {
    url: chapterUrl,
  }).window.document;
  assert.equal(
    new WattpadAdapter().isSupported(new URL(chapterUrl), document),
    false,
  );
});
