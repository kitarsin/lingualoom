import { build } from "esbuild";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = process.argv[2] ?? "all";
const targets = target === "all" ? ["firefox", "chromium"] : [target];

if (targets.some((name) => !["firefox", "chromium"].includes(name))) {
  throw new Error("Use all, firefox, or chromium as the build target.");
}

const commonManifest = JSON.parse(
  await readFile(resolve(root, "manifest.common.json"), "utf8"),
);

for (const name of targets) {
  const outdir = resolve(root, "dist", name);
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });

  const manifest = structuredClone(commonManifest);
  if (name === "firefox") {
    manifest.browser_specific_settings = {
      gecko: {
        id: "lingualoom@extension.local",
        data_collection_permissions: {
          required: ["authenticationInfo", "websiteContent"],
        },
      },
    };
    manifest.background = { scripts: ["background.js"] };
  } else {
    manifest.background = { service_worker: "background.js" };
  }

  await build({
    entryPoints: {
      content: resolve(root, "src/content/content-script.ts"),
      popup: resolve(root, "src/popup/popup.ts"),
      options: resolve(root, "src/options/options.ts"),
      background: resolve(root, "src/background/background.ts"),
    },
    outdir,
    bundle: true,
    format: "iife",
    target: "es2022",
    logLevel: "info",
  });

  await Promise.all([
    writeFile(
      resolve(outdir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
    copyFile(
      resolve(root, "src/popup/popup.html"),
      resolve(outdir, "popup.html"),
    ),
    copyFile(
      resolve(root, "src/popup/popup.css"),
      resolve(outdir, "popup.css"),
    ),
    copyFile(
      resolve(root, "src/options/options.html"),
      resolve(outdir, "options.html"),
    ),
    copyFile(
      resolve(root, "src/options/options.css"),
      resolve(outdir, "options.css"),
    ),
    copyFile(
      resolve(root, "src/content/content.css"),
      resolve(outdir, "content.css"),
    ),
  ]);
  console.log(`Built dist/${name}`);
}
