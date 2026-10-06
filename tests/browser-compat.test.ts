import assert from "node:assert/strict";
import test from "node:test";
import {
  activeTab,
  hasOpenRouterAccess,
  sendToTab,
} from "../src/browser/compat";

const globals = globalThis as typeof globalThis & {
  browser?: unknown;
  chrome?: unknown;
};

test("uses promise-based browser APIs when available", async () => {
  const previousBrowser = globals.browser;
  const previousChrome = globals.chrome;
  try {
    globals.chrome = undefined;
    globals.browser = {
      permissions: {
        contains: async (request: { origins: string[] }) =>
          request.origins[0] === "https://openrouter.ai/*",
      },
      tabs: {
        query: async () => [
          { id: 7, url: "https://www.wattpad.com/123-chapter" },
        ],
        sendMessage: async (_id: number, message: unknown) => message,
      },
    };
    assert.equal((await activeTab()).id, 7);
    assert.deepEqual(await sendToTab(7, { type: "status" }), {
      type: "status",
    });
    assert.equal(await hasOpenRouterAccess(), true);
  } finally {
    globals.browser = previousBrowser;
    globals.chrome = previousChrome;
  }
});

test("uses callback-based chrome APIs when browser is unavailable", async () => {
  const previousBrowser = globals.browser;
  const previousChrome = globals.chrome;
  try {
    globals.browser = undefined;
    globals.chrome = {
      permissions: {
        contains: (_request: unknown, callback: (granted: boolean) => void) =>
          callback(false),
      },
      tabs: {
        query: (_query: unknown, callback: (tabs: unknown[]) => void) =>
          callback([{ id: 9, url: "https://www.wattpad.com/123-chapter" }]),
        sendMessage: (
          _id: number,
          message: unknown,
          callback: (response: unknown) => void,
        ) => callback(message),
      },
      runtime: {},
    };
    assert.equal((await activeTab()).id, 9);
    assert.deepEqual(await sendToTab(9, { type: "status" }), {
      type: "status",
    });
    assert.equal(await hasOpenRouterAccess(), false);
  } finally {
    globals.browser = previousBrowser;
    globals.chrome = previousChrome;
  }
});
