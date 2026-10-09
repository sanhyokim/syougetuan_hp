// おせちページ（/osechi/）。文言・価格・日程・品書きはすべて osechi.json から受け取る。
// 公開状態は site.config.json の seasonalPage.status（"open" / "closed"）。"off" のときは呼ばれない。
import { esc, fill, yen, kanjiNumber, kanjiTime, englishTime, clock12, jaDate, jaDateKanji, enDate, enDateShort } from "./util.mjs";
import { copy } from "./copy.mjs";
import { head, header, footer, reserveUI, telHref, abs } from "./templates.mjs";

// 品数：煮しめのように中身が分かれる品は、その数だけ数える
export const itemCount = (o) =>
  o.tiers.flatMap((t) => t.groups.flatMap((g) => g.items)).reduce((n, it) => n + (it.parts?.ja?.length || 1), 0);

// 文中の {{…}} に入る値
function tokens(lang, o) {
  const ja = lang === "ja";
  return {
    cancelFreeUntil: ja ? jaDate(o.cancelFreeUntil) : enDate(o.cancelFreeUntil),
    pickupOpen: ja ? o.pickup.open : clock12(o.pickup.open),
    pickupClose: ja ? o.pickup.close : clock12(o.pickup.close),
    pickupDate: ja ? jaDateKanji(o.pickup.date) : enDateShort(o.pickup.date),
    pickupTime: ja ? kanjiTime(o.pickup.open) : englishTime(o.pickup.open),
    orderStart: ja ? jaDate(o.order.start) : enDate(o.order.start),
    orderEnd: ja ? jaDate(o.order.end) : enDate(o.order.end),
    box: o.box[lang],
    count: ja ? kanjiNumber(itemCount(o)) : itemCount(o),
    limit: o.limit,
    unit: o.limitUnit[lang],
  };
}

const priceText = (lang, o) =>
  lang === "ja"
    ? `<span class="num">${yen(o.price)}</span>円（${esc(o.priceNote.ja)}）`
    : `<span class="num">¥${yen(o.price)}</span> (${esc(o.priceNote.en)})`;

// 日付や時刻のひとかたまりを、途中で折り返さない
const nw = (s) => `<span class="nw">${esc(s)}</span>`;
const range = (lang, a, b) => (lang === "ja" ? `${nw(a)}〜${nw(b)}` : `${nw(a)} – ${nw(b)}`);

// ---------------------------------------------------------------- 構造化データ（Product / Offer）
export function osechiLd(lang, c, ctx) {
  const o = c.osechi;
  const open = c.seasonalPage.status === "open";
  const offer = {
    "@type": "Offer",
    url: ctx.pageUrl,
    price: String(o.price),
    priceCurrency: "JPY",
    availability: open ? "https://schema.org/PreOrder" : "https://schema.org/SoldOut",
    availabilityStarts: `${o.order.start}T${o.order.hours.open}:00+09:00`,
    availabilityEnds: `${o.order.end}T${o.order.hours.close}:00+09:00`,
    validFrom: `${o.order.start}T00:00:00+09:00`,
    validThrough: `${o.order.end}T23:59:59+09:00`,
    availableDeliveryMethod: "https://schema.org/OnSitePickup",
    eligibleRegion: { "@type": "Country", name: "JP" },
    seller: { "@type": "Restaurant", "@id": abs(c, "#restaurant"), name: c.shop.name[lang], telephone: c.shop.telIntl },
  };
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: lang === "ja" ? `${o.series.ja}「${o.name.ja}」` : `${o.name.en}, ${o.series.en}`,
    description: o.description[lang],
    image: [abs(c, o.photos.hero.src)],
    brand: { "@type": "Brand", name: c.shop.name[lang] },
    offers: offer,
  };
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

// ---------------------------------------------------------------- 写真（ファイルがあれば写真、なければ枠）
function figure(lang, c, ctx, p, { cls = "", eager = false } = {}) {
  const L = c.osechi.labels[lang];
  const size = ctx.sizes[p.src];
  if (!size) {
    return `<figure class="photo photo--placeholder o-photo ${cls}" role="img" aria-label="${esc(p.alt[lang] || L.photoPending)}">
          <span>${esc(L.photoPending)}</span>
        </figure>`;
  }
  return `<figure class="photo o-photo ${cls}" style="--w:${size.width}px">
          <img src="${ctx.base}${esc(p.src)}" alt="${esc(p.alt[lang])}" width="${size.width}" height="${size.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
          <figcaption>${esc(c.osechi.photoNote[lang])}</figcaption>
        </figure>`;
}

// ---------------------------------------------------------------- 各章
function hero(lang, c, ctx, tk) {
  const o = c.osechi;
  const L = o.labels[lang];
  const open = c.seasonalPage.status === "open";
  const name =
    lang === "ja"
      ? `<h1 class="o-name" aria-label="${esc(`${o.series.ja}「${o.name.ja}」`)}"><span class="o-name__series">${esc(o.series.ja)}</span><span class="o-name__main">${esc(o.name.ja)}</span></h1>`
      : `<h1 class="o-name"><span class="sr-only">${esc(`${o.name.en}, ${o.series.en}`)}</span><span class="o-name__series" aria-hidden="true">${esc(o.name.en)}</span><span class="o-name__main" lang="ja" aria-hidden="true">${esc(o.name.ja)}</span></h1>`;
  const meta = [
    lang === "ja" ? `${esc(o.box.ja)}　${esc(o.servings.ja)}` : `${esc(o.box.en)}, ${esc(o.servings.en.toLowerCase())}`,
    `${priceText(lang, o)}`,
    open ? esc(fill(L.heroOrder, tk)) : `<strong>${esc(o.closedNotice[lang])}</strong>`,
  ];
  if (lang === "en") meta.unshift(`<span class="o-hero__en-name">${esc(o.name.en)}</span>, ${esc(o.series.en.replace(/^Shogetsuan /, "our "))}`);
  if (o.reserve.heroAbroad?.[lang]) meta.push(`<strong>${esc(o.reserve.heroAbroad[lang])}</strong>`);
  return `<section class="o-hero" aria-label="${esc(o.name[lang])}">
        ${figure(lang, c, ctx, o.photos.hero, { cls: "o-hero__photo", eager: true })}
        ${name}
        <p class="o-hero__line">${esc(fill(L.heroLine, tk))}</p>
        <p class="o-hero__meta">${meta.join("<br>")}</p>
      </section>`;
}

// ---------------------------------------------------------------- トップページの案内（公開中だけ）
export function osechiBanner(lang, c, ctx) {
  if (c.seasonalPage.status !== "open") return "";
  const o = c.osechi;
  const L = o.labels[lang];
  const tk = tokens(lang, o);
  const p = o.photos.hero;
  const size = ctx.sizes[p.src];
  const href = `${ctx.root}${c.seasonalPage.path}`;
  const name = lang === "ja" ? `「${esc(o.name.ja)}」` : esc(o.name.en);
  const box = lang === "ja" ? `${esc(o.box.ja)}　${esc(o.servings.ja)}` : `${esc(o.box.en)}, ${esc(o.servings.en.toLowerCase())}`;
  const order = fill(esc(L.banner.order), { orderStart: nw(tk.orderStart), orderEnd: nw(tk.orderEnd) });
  return `
    <section class="o-banner" aria-labelledby="osechi-banner-h">
      <div class="o-banner__inner">
        ${size ? `<a class="o-banner__photo" href="${href}" tabindex="-1" aria-hidden="true"><img src="${ctx.base}${esc(p.src)}" alt="" width="${size.width}" height="${size.height}" loading="lazy" decoding="async"></a>` : ""}
        <div class="o-banner__text">
          <p class="o-banner__kicker">${esc(o.series[lang])}</p>
          <h2 id="osechi-banner-h" class="o-banner__name">${name}</h2>
          <p class="o-banner__meta">${box}<br>${order}</p>
          ${o.reserve.heroAbroad?.[lang] ? `<p class="o-banner__meta"><strong>${esc(o.reserve.heroAbroad[lang])}</strong></p>` : ""}
          <p><a class="o-banner__link" href="${href}">${esc(L.banner.link)}</a></p>
          ${size ? `<p class="o-banner__note">${esc(o.photoNote[lang])}</p>` : ""}
        </div>
      </div>
    </section>`;
}

const paras = (arr) => arr.map((p) => `<p>${esc(p)}</p>`).join("\n          ");

function greeting(lang, c) {
  const o = c.osechi;
  const sign = o.signature[lang];
  return `<section class="sec o-sec o-greeting" id="greeting" aria-labelledby="greeting-h">
      <div class="sec__inner">
        <h2 id="greeting-h">${esc(o.labels[lang].greeting)}</h2>
        <div class="o-greeting__text">
          ${paras(o.greeting[lang])}
          <p class="o-greeting__sign">${esc(sign)}</p>
        </div>
      </div>
    </section>`;
}

// 背景の一枚：文字を載せない帯。ファイルがないときは出さない
function mood(lang, c, ctx) {
  const p = c.osechi.photos.mood;
  const size = ctx.sizes[p.src];
  if (!size) return "";
  return `<figure class="o-mood" style="--w:${size.width}px">
      <img src="${ctx.base}${esc(p.src)}" alt="${esc(p.alt[lang])}" width="${size.width}" height="${size.height}" loading="lazy" decoding="async">
      <figcaption>${esc(c.osechi.photoNote[lang])}</figcaption>
    </figure>`;
}

function item(lang, it) {
  const sep = lang === "ja" ? "、" : ", ";
  const parts = it.parts?.[lang]?.length ? `<span class="o-item__parts">${lang === "ja" ? "（" : " ("}${esc(it.parts[lang].join(sep))}${lang === "ja" ? "）" : ")"}</span>` : "";
  const local = it.local?.[lang] ? `<span class="o-item__local">${esc(it.local[lang])}</span>` : "";
  return `<li${local ? ' class="is-local"' : ""}><span class="o-item__name">${esc(it[lang])}</span>${parts}${local}</li>`;
}

function menu(lang, c, ctx, tk) {
  const o = c.osechi;
  const L = o.labels[lang];
  const tiers = o.tiers
    .map(
      (t, i) => `<div class="o-tier o-tier--${i % 2 ? "even" : "odd"}" id="${esc(t.id)}">
          ${figure(lang, c, ctx, t.photo, { cls: "o-tier__photo" })}
          <div class="o-tier__text">
            <h3>${esc(t.name[lang])}</h3>
            ${t.groups
              .map(
                (g) => `<p class="o-group">${esc(g.name[lang])}</p>
            <ul class="o-items">
              ${g.items.map((it) => item(lang, it)).join("\n              ")}
            </ul>`
              )
              .join("\n            ")}
          </div>
        </div>`
    )
    .join("\n        ");
  return `<section class="sec o-sec o-menu" id="menu" aria-labelledby="menu-h">
      <div class="sec__inner">
        <h2 id="menu-h">${esc(L.menu)}</h2>
        <p class="lead o-menu__count">${esc(fill(L.menuCount, tk))}</p>
        ${tiers}
      </div>
    </section>`;
}

function details(lang, c) {
  const o = c.osechi;
  const L = o.labels[lang];
  const ja = lang === "ja";
  const d = ja ? jaDate : enDate;
  const time = (h) => (ja ? h : clock12(h));
  const rows = [
    [L.price, priceText(lang, o)],
    [L.quantity, esc(fill(L.quantityText, { limit: o.limit, unit: o.limitUnit[lang] }))],
    [L.contents, `${esc(o.box[lang])}${ja ? "／" : ", "}${esc(ja ? o.servings.ja : o.servings.en.toLowerCase())}${ja ? `／${nw(`全${itemCount(o)}品`)}` : `, ${itemCount(o)} dishes`}`],
    [L.orderPeriod, `${range(lang, d(o.order.start), d(o.order.end))}<br><span class="note">${esc(o.order.endNote[lang])}</span>`],
    [L.pickup, `${nw(d(o.pickup.date))}${ja ? "　" : ", "}<span class="num">${range(lang, time(o.pickup.open), time(o.pickup.close))}</span><br>${esc(o.pickup.place[lang])}`],
    [L.payment, esc(o.payment[lang])],
    [L.bestBefore, esc(d(o.bestBefore))],
    [L.storage, esc(o.storage[lang])],
    [L.howToEat, esc(o.howToEat[lang])],
  ];
  return `<section class="sec o-sec o-details" id="details" aria-labelledby="details-h">
      <div class="sec__inner">
        <h2 id="details-h">${esc(L.details)}</h2>
        <dl class="info o-info">
          ${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("\n          ")}
        </dl>
      </div>
    </section>`;
}

function allergens(lang, c) {
  const o = c.osechi;
  const A = o.allergens;
  const L = o.labels[lang];
  const unchecked = A.checked ? "" : `<p class="o-provisional">${esc(A.uncheckedNote[lang])}</p>`;
  const tables = A.groups
    .map(
      (g) => `<table>
            <caption>${esc(g.name[lang])}</caption>
            <thead><tr><th scope="col">${esc(L.allergenItem)}</th><th scope="col">${esc(L.allergenDishes)}</th></tr></thead>
            <tbody>
              ${g.rows
                .map((r) =>
                  r.dishes?.[lang]
                    ? `<tr class="is-used"><th scope="row">${esc(r[lang])}</th><td>${esc(r.dishes[lang])}</td></tr>`
                    : `<tr><th scope="row">${esc(r[lang])}</th><td><span aria-hidden="true">${esc(A.none[lang])}</span><span class="sr-only">${esc(L.allergenNone)}</span></td></tr>`
                )
                .join("\n              ")}
            </tbody>
          </table>`
    )
    .join("\n          ");
  return `<section class="sec o-sec o-allergens" id="allergens" aria-labelledby="allergens-h">
      <div class="sec__inner">
        <h2 id="allergens-h">${esc(L.allergens)}</h2>
        <div class="o-allergens__lead">
          <p>${esc(A.lead[lang])}</p>
          ${unchecked}
        </div>
        <div class="o-table">
          ${tables}
        </div>
      </div>
    </section>`;
}

function notes(lang, c, tk) {
  const o = c.osechi;
  return `<section class="sec o-sec o-notes" id="notes" aria-labelledby="notes-h">
      <div class="sec__inner">
        <h2 id="notes-h">${esc(o.labels[lang].notes)}</h2>
        <div class="policy o-policy">
          ${o.notes[lang].map((n) => `<p><span class="policy__label">${esc(n.label)}</span>${esc(fill(n.text, tk))}</p>`).join("\n          ")}
        </div>
      </div>
    </section>`;
}

function reserve(lang, c, tk) {
  const o = c.osechi;
  const L = o.labels[lang];
  const R = o.reserve;
  const ja = lang === "ja";
  const abroad = R.abroad?.[lang] ? `<p class="o-abroad">${esc(R.abroad[lang])}</p>` : "";
  if (c.seasonalPage.status !== "open") {
    return `<section class="sec o-sec o-reserve" id="reserve" aria-labelledby="reserve-h">
      <div class="sec__inner">
        <h2 id="reserve-h">${esc(L.reserve)}</h2>
        <p class="lead o-closed">${esc(o.closedNotice[lang])}</p>
      </div>
    </section>`;
  }
  const intl = ja ? "" : `<span class="act__sub">${esc(L.telAbroad)}: ${esc(c.shop.telIntl.replace(/^\+81-/, "+81 "))}</span>`;
  const hours = `<span class="num">${range(lang, ja ? o.order.hours.open : clock12(o.order.hours.open), ja ? o.order.hours.close : clock12(o.order.hours.close))}</span>${ja ? "（" : " ("}${esc(o.order.closedDays[lang])}${ja ? "）" : ")"}`;
  const period = range(lang, ja ? jaDate(o.order.start) : enDate(o.order.start), ja ? jaDate(o.order.end) : enDate(o.order.end));
  return `<section class="sec o-sec o-reserve" id="reserve" aria-labelledby="reserve-h">
      <div class="sec__inner">
        <h2 id="reserve-h">${esc(L.reserve)}</h2>
        <div class="o-reserve__main">
        ${abroad}
        <p class="lead o-reserve__lead">${esc(R.lead[lang])}</p>
        <a class="act act--tel o-tel" href="${telHref(c.shop.tel)}">
          <span class="act__label">${esc(L.telLabel)}</span>
          <span class="act__num num">${esc(c.shop.tel)}</span>
          ${intl}
        </a>
        <dl class="info o-info o-reserve__when">
          <div><dt>${esc(L.orderHours)}</dt><dd>${hours}</dd></div>
          <div><dt>${esc(L.orderPeriod)}</dt><dd>${period}<br><span class="note">${esc(o.order.endNote[lang])}</span></dd></div>
        </dl>
        </div>
        <div class="o-ask">
          <p class="o-ask__lead">${esc(R.askLead[lang])}</p>
          <ol>
            ${R.ask[lang].map((a) => `<li>${esc(fill(a, tk))}</li>`).join("\n            ")}
          </ol>
        </div>
      </div>
    </section>`;
}

// ---------------------------------------------------------------- ページ
export function osechiPage(lang, c, ctx) {
  const t = copy(lang, c);
  const o = c.osechi;
  const L = o.labels[lang];
  const tk = tokens(lang, o);
  const open = c.seasonalPage.status === "open";
  const title = `${L.pageTitle}｜${c.shop.name[lang]}`.replace("｜", lang === "ja" ? "｜" : " | ");
  const description = open ? o.description[lang] : `${o.closedNotice[lang]} ${o.description[lang]}`;
  // 受付中は、下の帯と右下の札をこのページのご予約へ。締切後は本体のご予約へ戻す
  const ui = open
    ? reserveUI(lang, c, ctx, { ...t, bar: { ...t.bar, reserve: L.bar.reserve } }, { onTop: false, target: "#reserve" })
    : reserveUI(lang, c, ctx, t, { onTop: false });
  return `${head(lang, c, ctx, t, { title, description, intro: true, introKey: "sg-osechi-intro", ld: osechiLd(lang, c, ctx), css: ["assets/css/osechi.css"] })}
<body class="page page--osechi${open ? "" : " is-closed"}">
  <a class="skip" href="#main">${esc(t.skip)}</a>
  ${header(lang, c, ctx, t, { onTop: false, current: true })}
  ${ui}
  <main id="main">
    ${hero(lang, c, ctx, tk)}
    ${greeting(lang, c)}
    ${mood(lang, c, ctx)}
    ${menu(lang, c, ctx, tk)}
    ${details(lang, c)}
    ${allergens(lang, c)}
    ${notes(lang, c, tk)}
    ${reserve(lang, c, tk)}
  </main>
  ${footer(lang, c, ctx, t)}
  <script src="${ctx.base}assets/js/site.js" defer></script>
</body>
</html>
`;
}
