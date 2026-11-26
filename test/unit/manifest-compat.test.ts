import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";

const root = fileURLToPath(new URL("../..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(root, "dsh-plugin.json"), "utf8"));

/**
 * 与 dsh-app-boot `plugin-compatibility.ts` 的判定保持一致：
 * `semver.satisfies(runtime, range, { includePrerelease: true })`
 */
function dshAccepts(runtime: string, range: string): boolean {
  return semver.satisfies(runtime, range, { includePrerelease: true });
}

describe("manifest/DSH 版本兼容声明", () => {
  it("engines.dsh 存在（有它时 dsh 只看它，忽略 peerDependencies）", () => {
    expect(typeof pkg.engines?.dsh).toBe("string");
  });

  it("engines.dsh 声明必须接受所有受支持的 dsh 运行时", () => {
    const range: string = pkg.engines.dsh;
    for (const runtime of [
      "0.1.1-rc.2",
      "0.2.0",
      "0.2.2-rc.5",
      "0.2.3-rc.1",
    ]) {
      expect(dshAccepts(runtime, range), `${runtime} 应被 ${range} 接受`).toBe(
        true,
      );
    }
  });

  it("engines.dsh 不能无限放宽：拒绝 0.1.0 与 0.3.0", () => {
    const range: string = pkg.engines.dsh;
    expect(dshAccepts("0.1.0", range)).toBe(false);
    expect(dshAccepts("0.3.0", range)).toBe(false);
  });

  it("peer 里的 @deepseek-ai/dsh-tools 与 engines.dsh 口径一致（避免 pnpm 误判）", () => {
    const peer: string = pkg.peerDependencies["@deepseek-ai/dsh-tools"];
    expect(peer).toBe(pkg.engines.dsh);
    expect(dshAccepts("0.2.2-rc.5", peer)).toBe(true);
  });

  it("dsh-plugin.json 的版本与 package.json 同步", () => {
    expect(manifest.version).toBe(pkg.version);
  });

  it("dsh-plugin.json 声明 5 个工具，且与 cordis 入口同名", () => {
    const names = manifest.contributes["x-tools"].map(
      (t: { name: string }) => t.name,
    );
    expect(names).toEqual([
      "pdf-edit-preview",
      "pdf-edit-page",
      "pdf-edit-document",
      "pdf-edit-relayout",
      "pdf-edit-insert",
    ]);
  });
});
