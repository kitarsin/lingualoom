interface Tab {
  id?: number;
  url?: string;
}

type MessageListener = (
  message: unknown,
  sender: MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void;

export interface MessageSender {
  id?: string;
  url?: string;
  tab?: { url?: string };
}

interface PromiseStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

interface CallbackStorageArea {
  get(key: string, callback: (items: Record<string, unknown>) => void): void;
  set(items: Record<string, unknown>, callback: () => void): void;
  remove(key: string, callback: () => void): void;
}

interface PromiseApi {
  permissions: {
    contains(permissions: { origins: string[] }): Promise<boolean>;
  };
  tabs: {
    query(query: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
  };
  runtime: {
    id: string;
    onMessage: { addListener(listener: MessageListener): void };
    sendMessage(message: unknown): Promise<unknown>;
    openOptionsPage(): Promise<void>;
  };
  storage: { local: PromiseStorageArea; session: PromiseStorageArea };
}

interface CallbackApi {
  permissions: {
    contains(
      permissions: { origins: string[] },
      callback: (granted: boolean) => void,
    ): void;
  };
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
    id: string;
    lastError?: { message: string };
    onMessage: { addListener(listener: MessageListener): void };
    sendMessage(message: unknown, callback: (response: unknown) => void): void;
    openOptionsPage(callback: () => void): void;
  };
  storage: { local: CallbackStorageArea; session: CallbackStorageArea };
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

export function extensionId(): string {
  const { browser, chrome } = namespaces();
  const id = browser?.runtime.id ?? chrome?.runtime.id;
  if (!id) throw new Error("WebExtensions API is unavailable.");
  return id;
}

export async function hasOpenRouterAccess(): Promise<boolean> {
  const { browser, chrome } = namespaces();
  const permission = { origins: ["https://openrouter.ai/*"] };
  if (browser) return browser.permissions.contains(permission);
  if (!chrome) throw new Error("WebExtensions API is unavailable.");
  return new Promise((resolve, reject) => {
    chrome.permissions.contains(permission, (granted) => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message));
      resolve(granted);
    });
  });
}

export async function runtimeSendMessage<T>(message: unknown): Promise<T> {
  const { browser, chrome } = namespaces();
  if (browser) return (await browser.runtime.sendMessage(message)) as T;
  if (!chrome) throw new Error("WebExtensions API is unavailable.");
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message));
      resolve(response as T);
    });
  });
}

export async function openOptionsPage(): Promise<void> {
  const { browser, chrome } = namespaces();
  if (browser) return browser.runtime.openOptionsPage();
  if (!chrome) throw new Error("WebExtensions API is unavailable.");
  return new Promise((resolve, reject) => {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message));
      resolve();
    });
  });
}

export function storageArea(name: "local" | "session") {
  const { browser, chrome } = namespaces();
  if (browser) return browser.storage[name];
  if (!chrome) throw new Error("WebExtensions API is unavailable.");
  const area = chrome.storage[name];
  return {
    get: (key: string): Promise<Record<string, unknown>> =>
      new Promise((resolve, reject) => {
        area.get(key, (items) => {
          if (chrome.runtime.lastError)
            return reject(new Error(chrome.runtime.lastError.message));
          resolve(items);
        });
      }),
    set: (items: Record<string, unknown>): Promise<void> =>
      new Promise((resolve, reject) => {
        area.set(items, () => {
          if (chrome.runtime.lastError)
            return reject(new Error(chrome.runtime.lastError.message));
          resolve();
        });
      }),
    remove: (key: string): Promise<void> =>
      new Promise((resolve, reject) => {
        area.remove(key, () => {
          if (chrome.runtime.lastError)
            return reject(new Error(chrome.runtime.lastError.message));
          resolve();
        });
      }),
  };
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
