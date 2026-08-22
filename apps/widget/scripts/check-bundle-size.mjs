import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const LIMIT_RAW_BYTES = 60 * 1024;
const LIMIT_GZIP_BYTES = 25 * 1024;

const bundlePath = new URL("../dist/widget.js", import.meta.url);

if (!existsSync(bundlePath)) {
  console.error(`[check-bundle-size] bundle not found at ${bundlePath.pathname}. Run "vite build" first.`);
  process.exit(1);
}

const content = readFileSync(bundlePath);
const gzipped = gzipSync(content);
const rawKb = (content.byteLength / 1024).toFixed(1);
const gzipKb = (gzipped.byteLength / 1024).toFixed(1);

console.warn(
  `[check-bundle-size] widget.js raw=${rawKb}KB (limit ${LIMIT_RAW_BYTES / 1024}KB) gzip=${gzipKb}KB (limit ${
    LIMIT_GZIP_BYTES / 1024
  }KB)`,
);

if (content.byteLength > LIMIT_RAW_BYTES || gzipped.byteLength > LIMIT_GZIP_BYTES) {
  console.error("[check-bundle-size] FAIL: widget bundle exceeds the configured size limits");
  process.exit(1);
}

console.warn("[check-bundle-size] OK");
