export type Command = { type: "status" | "translate" | "show-original" };

export type CommandResponse =
  | { ok: true; supported: boolean; translated: boolean }
  | { ok: false; error: string };
