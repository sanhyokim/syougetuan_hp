// site.config.json から、日本語・English のページ、季節ページ、sitemap.xml を生成する。
// 使い方: node build.mjs     （外部ライブラリは不要。Node.js 18 以上）
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homePage, seasonalPage } from "./src/templates.mjs";
import { imageSize } from "./src/util.mjs";
import { phraseBreaks } from "./src/phrase.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const c = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));

// ---------------------------------------------------------------- 設定の確認
const problems = [];
if (!/^https?:\/\/.+\/$/.test(c.siteUrl)) problems.push("siteUrl は https:// で始まり / で終わる URL にしてください");
if (typeof c.course.price !== "number") problems.push("course.price は数字だけで書いてください（例: 21780）");
if (!["off", "open", "closed"].includes(c.seasonalPage.state))
  problems.push('seasonalPage.state は "off" / "open" / "closed" のいずれかにしてください');
if (!/^[a-z0-9-]+\/$/.test(c.seasonalPage.path)) problems.push('seasonalPage.path は "osechi/" のような形にしてください');
for (const [k, s] of Object.entries(c.seasons)) {
  if (k === "heroAlt") continue;
  if (!s.hero?.src || !existsSync(join(ROOT, s.hero.src))) problems.push(`seasons.${k}.hero.src の写真が見つかりません: ${s.hero?.src}`);
}
for (const [k, p] of Object.entries(c.photos)) {
  if (p.src && !existsSync(join(ROOT, p.src))) problems.push(`photos.${k}.src の写真が見つかりません: ${p.src}`);
}
if (problems.length) {
  console.error("site.config.json を確認してください:\n- " + problems.join("\n- "));
  process.exit(1);
}

// ---------------------------------------------------------------- 共通の値
const now = new Date();
const month = now.getMonth() + 1;
const season = Object.entries(c.seasons).find(([, s]) => s.months?.includes(month))?.[0] ?? "winter";

const sizes = {};
const remember = (src) => src && (sizes[src] = imageSize(join(ROOT, src)));
Object.values(c.photos).forEach((p) => remember(p.src));
Object.values(c.seasons).forEach((s) => remember(s.hero?.src));
remember("assets/img/logo-sumi.png");

const q = encodeURIComponent(c.shop.mapQuery);
const shared = {
  season,
  sizes,
  buildYear: now.getFullYear(),
  heroSrc: c.seasons[season].hero.src,
  mapEmbed: `https://www.google.com/maps?q=${q}&output=embed`,
  mapLink: `https://www.google.com/maps/search/?api=1&query=${q}`,
};

const url = (path) => new URL(path, c.siteUrl).href;
const sp = c.seasonalPage;
const hasSeasonal = sp.state !== "off";

// path: サイト直下からの場所（"" / "en/" / "osechi/" / "en/osechi/"）
function context(lang, path, counterpart) {
  const depth = path.split("/").filter(Boolean).length;
  const base = "../".repeat(depth);
  const langRoot = lang === "en" ? "en/" : "";
  const toLangRoot = "../".repeat(depth - (lang === "en" ? 1 : 0)) || "";
  return {
    ...shared,
    base,
    root: toLangRoot,
    home: toLangRoot || "./",
    langHref: base + counterpart || "./",
    pageUrl: url(path),
    alternates: [
      { lang: "ja", href: url(lang === "ja" ? path : counterpart) },
      { lang: "en", href: url(lang === "en" ? path : counterpart) },
      { lang: "x-default", href: url(lang === "ja" ? path : counterpart) },
    ],
    langRoot,
  };
}

function write(path, html) {
  const file = join(ROOT, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, path.startsWith("en/") ? html : phraseBreaks(html));
  console.log("生成:", join(path, "index.html"));
}

// ---------------------------------------------------------------- ページ
write("", homePage("ja", c, context("ja", "", "en/")));
write("en/", homePage("en", c, context("en", "en/", "")));

const seasonalDirs = [sp.path, `en/${sp.path}`];
if (hasSeasonal) {
  write(sp.path, seasonalPage("ja", c, context("ja", sp.path, `en/${sp.path}`)));
  write(`en/${sp.path}`, seasonalPage("en", c, context("en", `en/${sp.path}`, sp.path)));
} else {
  // "off" のときは、以前に生成した季節ページも残さない
  for (const dir of seasonalDirs) {
    if (existsSync(join(ROOT, dir))) {
      rmSync(join(ROOT, dir), { recursive: true, force: true });
      console.log("削除:", dir);
    }
  }
}

// ---------------------------------------------------------------- sitemap / robots
const pairs = [["", "en/"]];
if (hasSeasonal) pairs.push([sp.path, `en/${sp.path}`]);
const entries = pairs
  .flatMap(([ja, en]) =>
    [ja, en].map(
      (loc) => `  <url>
    <loc>${url(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${url(ja)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${url(en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(ja)}"/>
  </url>`
    )
  )
  .join("\n");
writeFileSync(
  join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`
);
writeFileSync(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${url("sitemap.xml")}\n`);
console.log("生成: sitemap.xml, robots.txt");
console.log(`季節: ${season} ／ 季節ページ: ${sp.state}`);
