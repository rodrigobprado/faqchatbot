import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const emitWidgetManifest = (): Plugin => ({
  name: "emit-widget-manifest",
  apply: "build",
  closeBundle() {
    const outDir = resolve(process.cwd(), "dist");
    const bundlePath = resolve(outDir, "widget.js");
    const content = readFileSync(bundlePath);
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
    const versionedFile = `widget.${hash}.js`;

    copyFileSync(bundlePath, resolve(outDir, versionedFile));

    const previous = resolve(outDir, "manifest.json");
    let release = 1;
    try {
      const current = JSON.parse(readFileSync(previous, "utf-8")) as { release?: number };
      release = (current.release ?? 1) + 1;
    } catch {
      release = 1;
    }

    writeFileSync(
      previous,
      `${JSON.stringify(
        {
          file: "widget.js",
          versionedFile,
          hash,
          release,
          builtAt: new Date().toISOString()
        },
        null,
        2,
      )}\n`,
    );
  }
});

export default defineConfig({
  define: {
    __API_URL__: JSON.stringify(process.env.API_PUBLIC_URL ?? "http://localhost:3000")
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "ChatWidget",
      fileName: () => "widget.js",
      formats: ["iife"]
    },
    rollupOptions: {
      output: {
        extend: true
      }
    }
  },
  plugins: [emitWidgetManifest()],
  test: {
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["src/index.ts", "vite.config.ts", "**/dist/**"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
