import {
  defaultSettings,
  normalizeSettings,
  validateApiKey,
  validateSettings,
} from "./settings";
import type { Settings } from "./settings";

const settingsKey = "lingualoomSettings";
const apiKeyKey = "openrouterApiKey";

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface PublicSettings {
  settings: Settings;
  hasKey: boolean;
}

export class SettingsStore {
  constructor(
    private readonly local: StorageArea,
    private readonly session: StorageArea,
  ) {}

  async getSettings(): Promise<Settings> {
    const stored = await this.local.get(settingsKey);
    return stored[settingsKey] === undefined
      ? { ...defaultSettings }
      : normalizeSettings(stored[settingsKey]);
  }

  async getPublicSettings(): Promise<PublicSettings> {
    return {
      settings: await this.getSettings(),
      hasKey: Boolean(await this.getApiKey()),
    };
  }

  async getApiKey(): Promise<string | undefined> {
    const settings = await this.getSettings();
    const preferred = settings.rememberKey ? this.local : this.session;
    const stored = await preferred.get(apiKeyKey);
    return typeof stored[apiKeyKey] === "string"
      ? stored[apiKeyKey]
      : undefined;
  }

  async save(settingsInput: unknown, newApiKey?: string): Promise<void> {
    const settings = validateSettings(settingsInput);
    const existingKey = await this.getApiKey();
    const key = newApiKey?.trim() ? validateApiKey(newApiKey) : existingKey;
    const target = settings.rememberKey ? this.local : this.session;
    const other = settings.rememberKey ? this.session : this.local;

    if (key) await target.set({ [apiKeyKey]: key });
    await this.local.set({ [settingsKey]: settings });
    await other.remove(apiKeyKey);
  }

  async removeApiKey(): Promise<void> {
    await Promise.all([
      this.local.remove(apiKeyKey),
      this.session.remove(apiKeyKey),
    ]);
  }
}
