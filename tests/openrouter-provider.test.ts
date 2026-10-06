import assert from "node:assert/strict";
import test from "node:test";
import { defaultSettings } from "../src/settings/settings";
import { buildLiteraryPrompt } from "../src/translation/literary-prompt";
import {
  OpenRouterTranslationProvider,
  maxChapterCharacters,
  parseOpenRouterResponse,
} from "../src/translation/openrouter-translation-provider";

const settings = {
  ...defaultSettings,
  provider: "openrouter" as const,
  model: "example/model",
  sourceLanguage: "Auto",
  targetLanguage: "English",
};

test("literary prompt includes language and prose-preservation rules", () => {
  const messages = buildLiteraryPrompt(settings, ["No quería volver a casa."]);
  assert.match(messages[0].content, /narrative voice/);
  assert.match(messages[0].content, /dialogue style/);
  assert.match(messages[0].content, /paragraph structure/);
  assert.match(
    messages[0].content,
    /Do not summarize, add information, censor, embellish, or continue/,
  );
  assert.match(messages[1].content, /Detect the source language/);
  assert.match(messages[1].content, /Target language: English/);
  assert.match(messages[1].content, /No quería volver a casa/);
});

test("sends configured model and parses ordered translations", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (url, init) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: '{"paragraphs":["She did not want to return home."]}',
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const provider = new OpenRouterTranslationProvider(
    settings,
    "private-test-key",
    fakeFetch,
  );
  const result = await provider.translate({
    paragraphs: ["No quería volver a casa."],
  });

  assert.deepEqual(result.paragraphs, ["She did not want to return home."]);
  assert.equal(requestUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(requestInit?.redirect, "manual");
  assert.equal(
    (requestInit?.headers as Record<string, string>).Authorization,
    "Bearer private-test-key",
  );
  const body = JSON.parse(String(requestInit?.body));
  assert.equal(body.model, "example/model");
  assert.equal(
    body.messages[1].content.includes("No quería volver a casa."),
    true,
  );
});

test("rejects malformed, truncated, and wrong-count model responses", () => {
  assert.throws(() => parseOpenRouterResponse({}, 1), /invalid response/);
  assert.throws(
    () =>
      parseOpenRouterResponse(
        { choices: [{ finish_reason: "length", message: { content: "" } }] },
        1,
      ),
    /stopped before finishing/,
  );
  assert.throws(
    () =>
      parseOpenRouterResponse(
        { choices: [{ message: { content: "not JSON" } }] },
        1,
      ),
    /valid paragraph data/,
  );
  assert.throws(
    () =>
      parseOpenRouterResponse(
        { choices: [{ message: { content: '{"paragraphs":[]}' } }] },
        1,
      ),
    /wrong number/,
  );
});

test("maps authentication, rate, network, and size errors without exposing the key", async () => {
  const key = "private-test-key";
  for (const [status, pattern] of [
    [401, /rejected the API key/],
    [429, /rate limit/],
  ] as const) {
    const provider = new OpenRouterTranslationProvider(
      settings,
      key,
      async () => new Response("secret", { status }),
    );
    await assert.rejects(
      provider.translate({ paragraphs: ["Text"] }),
      (error: Error) => {
        assert.match(error.message, pattern);
        assert.equal(error.message.includes(key), false);
        return true;
      },
    );
  }
  const offline = new OpenRouterTranslationProvider(settings, key, async () => {
    throw new Error(key);
  });
  await assert.rejects(
    offline.translate({ paragraphs: ["Text"] }),
    (error: Error) => {
      assert.match(error.message, /Could not reach OpenRouter/);
      assert.equal(error.message.includes(key), false);
      return true;
    },
  );
  const oversized = new OpenRouterTranslationProvider(
    settings,
    key,
    async () => {
      throw new Error("Network should not be called");
    },
  );
  await assert.rejects(
    oversized.translate({ paragraphs: ["x".repeat(maxChapterCharacters + 1)] }),
    /Chunking is planned for Milestone 3/,
  );
});

test("connection check uses the key endpoint without a paid translation call", async () => {
  let method = "";
  let url = "";
  const provider = new OpenRouterTranslationProvider(
    settings,
    "private-test-key",
    async (input, init) => {
      url = String(input);
      method = init?.method ?? "";
      return new Response("{}", { status: 200 });
    },
  );
  await provider.testConnection();
  assert.equal(url, "https://openrouter.ai/api/v1/key");
  assert.equal(method, "GET");
});

test("calls browser fetch with the global receiver", async () => {
  const browserFetch = function (this: unknown): Promise<Response> {
    if (this !== globalThis) throw new TypeError("Illegal invocation");
    return Promise.resolve(new Response("{}", { status: 200 }));
  } as typeof fetch;
  const provider = new OpenRouterTranslationProvider(
    settings,
    "private-test-key",
    browserFetch,
  );
  await provider.testConnection();
});

test("stops on a provider redirect without forwarding the key or chapter text", async () => {
  const provider = new OpenRouterTranslationProvider(
    settings,
    "private-test-key",
    async () => Response.redirect("https://example.com", 307),
  );
  await assert.rejects(
    provider.translate({ paragraphs: ["Secret chapter text"] }),
    /redirected the request/,
  );
});
