import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();

function runNodeScript(relativePath) {
  const scriptPath = path.join(ROOT, relativePath);
  execFileSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    stdio: "pipe",
  });
}

describe("security static checks", () => {
  test("first-party code does not use blocked dynamic DOM/code execution patterns", () => {
    expect(() => {
      runNodeScript("scripts/security/check-static-patterns.mjs");
    }).not.toThrow();
  });

  test("first-party code and workflow files do not contain obvious hardcoded secrets", () => {
    expect(() => {
      runNodeScript("scripts/security/check-secret-patterns.mjs");
    }).not.toThrow();
  });
});
