// 使い方: node tools/check-osechi.mjs .   （site.config.json は最後に元の状態へ戻します）
// off / open / closed の各状態でビルドし、リンク切れ・告知・サイトマップ・電話ボタンを確かめる
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
const ROOT = process.argv[2];
const cfgPath = join(ROOT, "site.config.json");
const original = readFileSync(cfgPath, "utf8");
const pages = ["index.html", "en/index.html", "osechi/index.html", "en/osechi/index.html"];
let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "  ok " : "  NG "} ${msg}`); if (!cond) fail++; };
for (const status of ["off", "open", "closed"]) {
  writeFileSync(cfgPath, original.replace(/"status": "\w+"/, `"status": "${status}"`));
  execSync("node build.mjs", { cwd: ROOT, stdio: "pipe" });
  console.log(`\n[${status}]`);
  const exists = pages.filter((p) => existsSync(join(ROOT, p)));
  ok((status === "off") === !exists.includes("osechi/index.html") && (status === "off") === !exists.includes("en/osechi/index.html"), `おせちページ: ${status === "off" ? "なし" : "あり"}`);
  const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
  ok(sitemap.includes("/osechi/") === (status !== "off"), `サイトマップの /osechi/: ${status === "off" ? "なし" : "あり"}`);
  for (const home of ["index.html", "en/index.html"]) {
    const h = readFileSync(join(ROOT, home), "utf8");
    ok(h.includes('class="notice"') === (status === "open"), `${home} の告知帯: ${status === "open" ? "あり" : "なし"}`);
    ok(h.includes('class="o-banner"') === (status === "open"), `${home} のおせち案内: ${status === "open" ? "あり" : "なし"}`);
    ok(/href="[^"]*osechi\//.test(h) === (status === "open"), `${home} のおせちへのリンク: ${status === "open" ? "あり" : "なし"}`);
  }
  for (const p of exists) {
    const h = readFileSync(join(ROOT, p), "utf8");
    const ids = new Set([...h.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    const hrefs = [...h.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|tel:|mailto:|data:)/.test(u));
    const broken = [];
    for (const u of hrefs) {
      const [path, hash] = u.split("#");
      let target = path ? resolve(dirname(join(ROOT, p)), path) : join(ROOT, p);
      if (path && (path.endsWith("/") || path === "." || path === "./" || existsSync(target) && !target.includes("."))) target = join(target, "index.html");
      if (!existsSync(target)) { broken.push(u); continue; }
      if (hash) {
        const th = readFileSync(target, "utf8");
        if (!th.includes(` id="${hash}"`)) broken.push(u);
      }
    }
    ok(broken.length === 0, `${p} のリンク切れ: ${broken.length ? broken.join(", ") : "なし"}`);
    if (p.includes("osechi")) {
      const tel = h.includes('class="act act--tel o-tel"');
      ok(tel === (status === "open"), `${p} の電話ボタン: ${status === "open" ? "あり" : "なし"}`);
      const o = JSON.parse(readFileSync(join(ROOT, "osechi.json"), "utf8"));
      const lang = p.startsWith("en/") ? "en" : "ja";
      ok(h.includes(o.closedNotice[lang]) === (status === "closed"), `${p} の「締め切りました」: ${status === "closed" ? "あり" : "なし"}`);
      const ld = h.match(/"availability": "([^"]+)"/)?.[1];
      ok(ld === (status === "open" ? "https://schema.org/PreOrder" : "https://schema.org/SoldOut"), `${p} の Offer.availability: ${ld}`);
      ok(!/20\d\d年|令和/.test(h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "")), `${p} の本文に固定の年号: なし`);
    }
  }
}
writeFileSync(cfgPath, original);
execSync("node build.mjs", { cwd: ROOT, stdio: "pipe" });
console.log(fail ? `\n${fail} 件の問題` : "\nすべて問題なし");
process.exit(fail ? 1 : 0);
