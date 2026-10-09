// site.config.json と osechi.json から、日本語・English のページ、おせちページ、sitemap.xml を生成する。
// 使い方: node build.mjs     （外部ライブラリは不要。Node.js 18 以上）
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homePage } from "./src/templates.mjs";
import { osechiPage, itemCount } from "./src/osechi.mjs";
import { imageSize, parseDate } from "./src/util.mjs";
import { phraseBreaks } from "./src/phrase.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
function readJson(name) {
  try {
    return JSON.parse(readFileSync(join(ROOT, name), "utf8"));
  } catch (e) {
    console.error(`${name} の書き方に誤りがあります（" や , の消し忘れ・付けすぎがないか確認してください）:\n${e.message}`);
    process.exit(1);
  }
}
const c = readJson("site.config.json");
c.osechi = readJson("osechi.json");
// 以前の書き方（seasonalPage.state）も読めるようにしておく
if (c.seasonalPage.status === undefined && c.seasonalPage.state !== undefined) c.seasonalPage.status = c.seasonalPage.state;

// ---------------------------------------------------------------- 設定の確認
const problems = [];
if (!/^https?:\/\/.+\/$/.test(c.siteUrl)) problems.push("siteUrl は https:// で始まり / で終わる URL にしてください");
if (typeof c.course.price !== "number") problems.push("course.price は数字だけで書いてください（例: 21780）");
if (!["off", "open", "closed"].includes(c.seasonalPage.status))
  problems.push('seasonalPage.status は "off" / "open" / "closed" のいずれかにしてください');
if (!/^[a-z0-9-]+\/$/.test(c.seasonalPage.path)) problems.push('seasonalPage.path は "osechi/" のような形にしてください');
for (const [k, s] of Object.entries(c.seasons)) {
  if (k === "heroAlt") continue;
  if (!s.hero?.src || !existsSync(join(ROOT, s.hero.src))) problems.push(`seasons.${k}.hero.src の写真が見つかりません: ${s.hero?.src}`);
}
for (const [k, p] of Object.entries(c.photos)) {
  if (p.src && !existsSync(join(ROOT, p.src))) problems.push(`photos.${k}.src の写真が見つかりません: ${p.src}`);
}
// おせち（osechi.json）
const o = c.osechi;
const warnings = [];
if (c.seasonalPage.status !== "off") {
  if (typeof o.price !== "number") problems.push("osechi.json の price は数字だけで書いてください（例: 30000）");
  if (typeof o.limit !== "number") problems.push("osechi.json の limit は数字だけで書いてください（例: 20）");
  const dates = { "order.start": o.order?.start, "order.end": o.order?.end, "pickup.date": o.pickup?.date, bestBefore: o.bestBefore, cancelFreeUntil: o.cancelFreeUntil };
  for (const [k, v] of Object.entries(dates)) {
    if (!parseDate(v)) problems.push(`osechi.json の ${k} は "2026-12-31" の形の正しい日付にしてください（いま: ${v}）`);
  }
  if (parseDate(o.order?.start) && parseDate(o.order?.end) && o.order.start > o.order.end)
    problems.push("osechi.json の order.start（受付開始）が order.end（締切）より後になっています");
  if (parseDate(o.order?.end) && parseDate(o.pickup?.date) && o.order.end > o.pickup.date)
    problems.push("osechi.json の order.end（締切）が pickup.date（受け渡し）より後になっています");
  for (const k of ["open", "close"]) {
    if (!/^\d{2}:\d{2}$/.test(o.pickup?.[k] ?? "")) problems.push(`osechi.json の pickup.${k} は "11:00" の形にしてください`);
    if (!/^\d{2}:\d{2}$/.test(o.order?.hours?.[k] ?? "")) problems.push(`osechi.json の order.hours.${k} は "15:00" の形にしてください`);
  }
  if (!o.photos?.hero?.src) problems.push("osechi.json の photos.hero.src を書いてください");
  else if (!existsSync(join(ROOT, o.photos.hero.src))) warnings.push(`おせちのヒーロー写真がありません（${o.photos.hero.src}）。枠だけを表示します`);
  for (const t of o.tiers ?? []) {
    if (t.photo?.src && !existsSync(join(ROOT, t.photo.src))) warnings.push(`${t.name.ja}の写真がありません（${t.photo.src}）。「写真を準備中です」の枠を表示します`);
  }
  if (c.seasonalPage.status === "open" && !o.allergens?.checked)
    warnings.push("アレルギーの表が「仮」のままです。店で確かめたら osechi.json の allergens.checked を true にしてください");
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
[o.photos.hero, o.photos.mood, ...o.tiers.map((t) => t.photo)].forEach((p) => remember(p?.src));

const q = encodeURIComponent(c.shop.mapQuery);
// 住所だけだとピンが立たないことがあるので、緯度・経度があればそれで地図を出す
const m = c.shop.map ?? {};
const pin = typeof m.lat === "number" && typeof m.lng === "number" ? `${m.lat},${m.lng}` : null;
const shared = {
  season,
  sizes,
  buildYear: now.getFullYear(),
  heroSrc: c.seasons[season].hero.src,
  mapEmbed: `https://www.google.com/maps?q=${pin ?? q}&z=17&output=embed`,
  mapLink: m.url || `https://www.google.com/maps/search/?api=1&query=${q}`,
};

const url = (path) => new URL(path, c.siteUrl).href;
const sp = c.seasonalPage;
const hasSeasonal = sp.status !== "off";

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
  write(sp.path, osechiPage("ja", c, context("ja", sp.path, `en/${sp.path}`)));
  write(`en/${sp.path}`, osechiPage("en", c, context("en", `en/${sp.path}`, sp.path)));
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
// 確認用の公開（noindex）のあいだは、各ページの meta robots で検索に出さない。
// robots.txt で巡回を止めると meta が読まれないので、巡回は許したままサイトマップだけ外す
writeFileSync(join(ROOT, "robots.txt"), c.noindex ? "User-agent: *\nAllow: /\n" : `User-agent: *\nAllow: /\n\nSitemap: ${url("sitemap.xml")}\n`);
console.log("生成: sitemap.xml, robots.txt");
console.log(`季節: ${season} ／ おせちページ: ${sp.status}${hasSeasonal ? `（全${itemCount(o)}品）` : ""}`);
for (const w of warnings) console.warn(`注意: ${w}`);
