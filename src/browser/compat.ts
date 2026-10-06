interface Tab {
  id?: number;
  url?: string;
}

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean | void;

interface PromiseApi {
  tabs: {
    query(query: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
  };
  runtime: { onMessage: { addListener(listener: MessageListener): void } };
}

interface CallbackApi {
  tabs: {
    query(
      query: { active: boolean; currentWindow: boolean },
      callback: (tabs: Tab[]) => void,
    ): void;
    sendMessage(
      tabId: number,
      message: unknown,
      callback: (response: unknown) => void,
    ): void;
  };
  runtime: {
    lastError?: { message: string };
    onMessage: { addListener(listener: MessageListener): void };
  };
}

function namespaces(): { browser?: PromiseApi; chrome?: CallbackApi } {
  return globalThis as typeof globalThis & {
    browser?: PromiseApi;
    chrome?: CallbackApi;
  };
}

export function onMessage(listener: MessageListener): void {
  const { browser, chrome } = namespaces();
  const api = browser ?? chrome;
  if (!api) throw new Error("WebExtensions API is unavailable.");
  api.runtime.onMessage.addListener(listener);
}

export async function activeTab(): Promise<Tab> {
  const { browser, chrome } = namespaces();
  let tabs: Tab[];
  if (browser) {
    tabs = await browser.tabs.query({ active: true, currentWindow: true });
  } else if (chrome) {
    tabs = await new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (result) => {
        if (chrome.runtime.lastError)
          return reject(new Error(chrome.runtime.lastError.message));
        resolve(result);
      });
    });
  } else {
    throw new Error("WebExtensions API is unavailable.");
  }
  const tab = tabs[0];
  if (tab?.id === undefined) throw new Error("No active tab is available.");
  return tab;
}

export async function sendToTab<T>(
  tabId: number,
  message: unknown,
): Promise<T> {
  const { browser, chrome } = namespaces();
  if (browser) return (await browser.tabs.sendMessage(tabId, message)) as T;
  if (!chrome) throw new Error("WebExtensions API is unavailable.");
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message));
      resolve(response as T);
    });
  });
}
