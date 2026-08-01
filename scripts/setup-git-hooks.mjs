import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const shouldSkip = () => Boolean(process.env.CI) || !existsSync(".git");

if (!shouldSkip()) {
  execFileSync("git", ["config", "core.hooksPath", ".husky"], { stdio: "inherit" });
}
