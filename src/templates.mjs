// HTML の雛形。値はすべて site.config.json と copy.mjs から受け取る。
import { esc, fill, yen, clock12 } from "./util.mjs";
import { copy } from "./copy.mjs";

const FONTS =
  "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Zen+Old+Mincho:wght@400;600&display=swap";

export const telHref = (tel) => `tel:${tel.replace(/[^0-9+]/g, "")}`;
export const abs = (c, path) => new URL(path, c.siteUrl).href;
const other = (lang) => (lang === "ja" ? "en" : "ja");

// ---------------------------------------------------------------- 構造化データ
export function jsonLd(lang, c, ctx) {
  const a = c.shop.address[lang];
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": abs(c, "#restaurant"),
    name: c.shop.name[lang],
    alternateName: [c.shop.name[other(lang)], c.shop.shortName.ja, c.shop.shortName.en],
    url: ctx.pageUrl,
    image: [abs(c, "assets/img/ogp.jpg"), abs(c, ctx.heroSrc)],
    telephone: c.shop.telIntl,
    address: {
      "@type": "PostalAddress",
      postalCode: c.shop.postalCode,
      addressRegion: a.region,
      addressLocality: a.locality,
      streetAddress: a.street,
      addressCountry: "JP",
    },
    servesCuisine: lang === "ja" ? ["日本料理", "割烹"] : ["Japanese", "Kappo"],
    acceptsReservations: true,
    priceRange: `¥${yen(c.course.price)}`,
    currenciesAccepted: "JPY",
    paymentAccepted: c.payment[lang],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: c.hours.openDays.map((d) => `https://schema.org/${d}`),
        opens: c.hours.open,
        closes: c.hours.close,
      },
    ],
    hasMenu: {
      "@type": "Menu",
      inLanguage: lang,
      hasMenuItem: {
        "@type": "MenuItem",
        name: c.course.name[lang],
        offers: { "@type": "Offer", price: String(c.course.price), priceCurrency: "JPY" },
      },
    },
    award: c.shop.award[lang],
    hasMap: ctx.mapLink,
    potentialAction: {
      "@type": "ReserveAction",
      target: c.reservation.url[lang],
    },
  };
  if (c.shop.instagram) data.sameAs = [c.shop.instagram];
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

// ---------------------------------------------------------------- head
export function head(lang, c, ctx, t, { title = t.title, description = t.description, intro = false, introKey = "sg-intro", ld = null, css = [] } = {}) {
  const alternates = ctx.alternates
    .map((alt) => `<link rel="alternate" hreflang="${alt.lang}" href="${esc(alt.href)}">`)
    .join("\n  ");

  // 季節（月から決める）とトップの演出（初回だけ・動きを減らす設定では出さない）
  const monthMap = {};
  for (const [name, s] of Object.entries(c.seasons)) {
    if (Array.isArray(s.months)) s.months.forEach((m) => (monthMap[m] = name));
  }
  const inline = `(function(d){var M=${JSON.stringify(monthMap)},r=d.documentElement,s=M[new Date().getMonth()+1];if(s)r.setAttribute("data-season",s);${
    intro
      ? `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&!sessionStorage.getItem("${introKey}")){r.classList.add("is-intro");sessionStorage.setItem("${introKey}","1")}}catch(e){}`
      : ""
  }r.classList.add("js")})(document);`;

  return `<!doctype html>
<html lang="${lang}" data-season="${ctx.season}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(ctx.pageUrl)}">
  ${alternates}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(c.shop.name[lang])}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(ctx.pageUrl)}">
  <meta property="og:image" content="${esc(abs(c, "assets/img/ogp.jpg"))}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="${lang === "ja" ? "ja_JP" : "en_US"}">
  <meta property="og:locale:alternate" content="${lang === "ja" ? "en_US" : "ja_JP"}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0F1312">
  <link rel="icon" href="${ctx.base}assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="${ctx.base}assets/img/favicon-48.png" sizes="48x48" type="image/png">
  <link rel="apple-touch-icon" href="${ctx.base}assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${FONTS}">
  <link rel="stylesheet" href="${ctx.base}assets/css/site.css">${css.map((f) => `\n  <link rel="stylesheet" href="${ctx.base}${f}">`).join("")}
  <script>${inline}</script>
  <script type="application/ld+json">
${ld ?? jsonLd(lang, c, ctx)}
  </script>
</head>`;
}

// ---------------------------------------------------------------- 季節ページの告知帯・ナビ
export const seasonalOpen = (c) => c.seasonalPage.status === "open";

function notice(lang, c, ctx) {
  if (!seasonalOpen(c)) return "";
  return `<p class="notice"><a href="${ctx.root}${c.seasonalPage.path}">${esc(c.osechi.notice[lang])}</a></p>`;
}

export function header(lang, c, ctx, t, { onTop = true, current = false } = {}) {
  const h = onTop ? "#" : `${ctx.home}#`;
  const items = Object.entries(t.nav)
    .map(([id, label]) => `<li><a href="${h}${id}">${esc(label)}</a></li>`)
    .join("\n          ");
  const seasonal = seasonalOpen(c)
    ? `\n          <li><a href="${current ? "./" : ctx.root + c.seasonalPage.path}"${current ? ' aria-current="page"' : ""}>${esc(c.osechi.nav[lang])}</a></li>`
    : "";
  return `<header class="site-header${onTop ? "" : " site-header--page"}">
    <a class="wordmark" href="${ctx.home}">${esc(c.shop.name[lang])}</a>
    <nav class="nav" aria-label="${esc(t.navLabel)}">
      <ul class="nav-list" id="nav-list">
          ${items}${seasonal}
      </ul>
      <a class="lang" href="${esc(ctx.langHref)}" hreflang="${t.langSwitch.lang}" lang="${t.langSwitch.lang}">${esc(t.langSwitch.label)}</a>
    </nav>
  </header>`;
}

// ---------------------------------------------------------------- 写真
function photo(lang, c, ctx, key, { cls = "", eager = false } = {}) {
  const p = c.photos[key];
  if (!p?.src) {
    return `<figure class="photo photo--placeholder ${cls}" role="img" aria-label="${esc(p?.alt?.[lang] ?? "")}">
        <span>${esc(copy(lang, c).kitchen.placeholder)}</span>
      </figure>`;
  }
  const size = ctx.sizes[p.src];
  const wh = size ? ` width="${size.width}" height="${size.height}"` : "";
  return `<figure class="photo ${cls}">
        <img src="${ctx.base}${esc(p.src)}" alt="${esc(p.alt[lang])}"${wh} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
      </figure>`;
}

// ---------------------------------------------------------------- トップ（ヒーロー）
function hero(lang, c, ctx, t) {
  const s = c.seasons[ctx.season].hero;
  const data = Object.entries(c.seasons)
    .filter(([, v]) => v.hero)
    .map(([k, v]) => ` data-src-${k}="${ctx.base}${esc(v.hero.src)}" data-pos-${k}="${esc(v.hero.positionMobile || "50% 50%")}"`)
    .join("");
  const size = ctx.sizes[s.src];
  const wh = size ? ` width="${size.width}" height="${size.height}"` : "";
  const name =
    lang === "ja"
      ? `<h1 class="hero-name" aria-label="${esc(c.shop.name.ja)}"><span class="hero-name__kind">${esc(c.shop.kind.ja)}</span><span class="hero-name__main">${esc(c.shop.shortName.ja)}</span></h1>`
      : `<h1 class="hero-name"><span class="sr-only">${esc(c.shop.name.en)}</span><span class="hero-name__kind" lang="ja" aria-hidden="true">${esc(c.shop.kind.ja)}</span><span class="hero-name__main" lang="ja" aria-hidden="true">${esc(c.shop.shortName.ja)}</span></h1>`;
  return `<section class="hero" aria-label="${esc(c.shop.name[lang])}">
      <figure class="hero-photo">
        <img src="${ctx.base}${esc(s.src)}" alt="${esc(c.seasons.heroAlt[lang])}"${wh} fetchpriority="high" decoding="async" style="--pos-m:${esc(s.positionMobile || "50% 50%")}"${data}>
        <script>(function(i){var s=document.documentElement.getAttribute("data-season"),src=i.getAttribute("data-src-"+s),p=i.getAttribute("data-pos-"+s);if(src&&i.getAttribute("src")!==src)i.src=src;if(p)i.style.setProperty("--pos-m",p)})(document.currentScript.previousElementSibling)</script>
      </figure>
      ${name}
      <p class="hero-line">${esc(t.heroLine)}</p>
    </section>`;
}

// ---------------------------------------------------------------- 各章
const paras = (arr, cls = "") => arr.map((p) => `<p${cls ? ` class="${cls}"` : ""}>${esc(p)}</p>`).join("\n        ");

function seats(lang, c, ctx, t) {
  return `<section class="sec sec--seats" id="seats" aria-labelledby="seats-h">
      <div class="sec__inner">
        <h2 id="seats-h">${esc(t.seats.heading)}</h2>
        ${photo(lang, c, ctx, "seats", { cls: "seats__photo" })}
        <div class="seats__text">
          <p class="lead">${esc(t.seats.lead)}</p>
          ${paras(t.seats.body)}
        </div>
      </div>
    </section>`;
}

function omakase(lang, c, ctx, t) {
  const riceLines = Object.entries(c.seasons)
    .filter(([, v]) => v?.rice?.[lang])
    .map(([k, v]) => `<p class="rice__season" data-season-only="${k}">${esc(v.rice[lang])}</p>`)
    .join("\n          ");
  const amount =
    lang === "ja"
      ? `<span class="num">${yen(c.course.price)}</span>${t.omakase.yen}`
      : `<span class="num">¥${yen(c.course.price)}</span>`;
  return `<section class="sec sec--omakase" id="omakase" aria-labelledby="omakase-h">
      <div class="sec__inner">
        <h2 id="omakase-h">${esc(t.omakase.heading)}</h2>
        ${photo(lang, c, ctx, "omakase", { cls: "omakase__photo" })}
        <div class="omakase__text">
          <p class="lead">${esc(t.omakase.lead)}</p>
          ${paras(t.omakase.body)}
          <div class="rice">
          <p>${esc(t.omakase.rice)}</p>
          ${riceLines}
          </div>
        </div>
        <div class="price">
          <p class="price__name">${esc(c.course.name[lang])}</p>
          <p class="price__amount">${amount}<span class="price__note">${lang === "ja" ? `（${esc(c.course.priceNote.ja)}）` : ` (${esc(c.course.priceNote.en)})`}</span></p>
          <p class="note">${esc(c.course.change[lang])}</p>
        </div>
      </div>
    </section>`;
}

function utsuwa(lang, c, ctx, t) {
  return `<section class="sec sec--utsuwa" id="utsuwa" aria-labelledby="utsuwa-h">
      <div class="sec__inner">
        <h2 id="utsuwa-h">${esc(t.utsuwa.heading)}</h2>
        ${photo(lang, c, ctx, "utsuwa", { cls: "utsuwa__photo" })}
        <div class="utsuwa__text">
          ${paras(t.utsuwa.body)}
        </div>
      </div>
    </section>`;
}

function kitchen(lang, c, ctx, t) {
  const w = c.chef.words[lang];
  const words =
    lang === "ja"
      ? `<p class="words words--vertical">${(Array.isArray(w) ? w : [w]).map((l) => `<span>${esc(l)}</span>`).join("")}</p>`
      : `<p class="words">${esc(Array.isArray(w) ? w.join(" ") : w)}</p>`;
  const name = c.chef.name[lang] ? `<p class="chef-name">${esc(c.chef.title[lang])}　${esc(c.chef.name[lang])}</p>` : "";
  return `<section class="sec sec--kitchen" id="kitchen" aria-labelledby="kitchen-h">
      <div class="sec__inner">
        <h2 id="kitchen-h">${esc(t.kitchen.heading)}</h2>
        ${words}
        ${photo(lang, c, ctx, "kitchen", { cls: "kitchen__photo" })}
        <div class="kitchen__text">
          ${name}
          <p>${esc(c.chef.career[lang])}</p>
          <p>${esc(c.chef.okami[lang])}</p>
        </div>
      </div>
    </section>`;
}

function reserveActions(lang, c, t) {
  const abroad =
    lang === "en" ? `<span class="act__sub">${esc(t.reserve.telAbroad)}: ${esc(c.shop.telIntl.replace(/^\+81-/, "+81 "))}</span>` : "";
  return `<div class="actions">
          <a class="act act--tel" href="${telHref(c.shop.tel)}">
            <span class="act__label">${esc(t.reserve.telLabel)}</span>
            <span class="act__num num">${esc(c.shop.tel)}</span>
            ${abroad}
          </a>
          <a class="act act--site" href="${esc(c.reservation.url[lang])}" target="_blank" rel="noopener">${esc(t.reserve.site)}<span class="sr-only">${esc(t.reserve.newTab)}</span></a>
        </div>`;
}

function reserve(lang, c, ctx, t) {
  const r = c.reservation;
  const tokens = { arrive: r.arriveMinutesBefore, cancelDayBefore: r.cancellation.dayBefore, cancelSameDay: r.cancellation.sameDay };
  const policy = r.policy[lang]
    .map((p) => `<p><span class="policy__label">${esc(p.label)}</span>${esc(fill(p.text, tokens))}</p>`)
    .join("\n          ");
  return `<section class="sec sec--reserve" id="reserve" aria-labelledby="reserve-h">
      <div class="sec__inner">
        <h2 id="reserve-h">${esc(t.reserve.heading)}</h2>
        <p class="lead reserve__lead">${esc(t.reserve.lead)}</p>
        <p class="reserve__price">${esc(c.course.name[lang])}${lang === "ja" ? "　" : " "}${lang === "ja" ? `<span class="num">${yen(c.course.price)}</span>円（${esc(c.course.priceNote.ja)}）` : `<span class="num">¥${yen(c.course.price)}</span> (${esc(c.course.priceNote.en)})`}</p>
        ${reserveActions(lang, c, t)}
        <div class="policy">
          <p class="policy__lead">${esc(t.reserve.policyLead)}</p>
          ${policy}
        </div>
      </div>
    </section>`;
}

function hoursText(lang, c) {
  const h = c.hours;
  return lang === "ja"
    ? `${h.open}〜${h.close}（L.O. ${h.lastOrder}）`
    : `${clock12(h.open)} – ${clock12(h.close)} (last order ${clock12(h.lastOrder)})`;
}

function addressText(lang, c) {
  const a = c.shop.address[lang];
  return lang === "ja"
    ? `〒${c.shop.postalCode}<br>${esc(a.region + a.locality + a.street)}`
    : `${esc(a.street)}, ${esc(a.locality)} ${esc(c.shop.postalCode)}, Japan`;
}

function access(lang, c, ctx, t) {
  const A = t.access;
  const directions = c.shop.directions[lang]?.length
    ? `<ol class="directions">${c.shop.directions[lang].map((d) => `<li>${esc(d)}</li>`).join("")}</ol>`
    : "";
  const insta = c.shop.instagram
    ? `<br><a href="${esc(c.shop.instagram)}" target="_blank" rel="noopener">${esc(A.instagram)}</a>`
    : "";
  return `<section class="sec sec--access on-light" id="access" aria-labelledby="access-h">
      <div class="sec__inner">
        <h2 id="access-h">${esc(A.heading)}</h2>
        <div class="map">
          <iframe src="${esc(ctx.mapEmbed)}" title="${esc(A.map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          <p><a href="${esc(ctx.mapLink)}" target="_blank" rel="noopener">${esc(A.mapLink)}<span class="sr-only">${esc(t.reserve.newTab)}</span></a></p>
        </div>
        <dl class="info">
          <div><dt>${esc(A.address)}</dt><dd>${addressText(lang, c)}${
            lang === "en"
              ? `<br><span class="note">${esc(A.taxi)}:</span><br><span lang="ja">〒${esc(c.shop.postalCode)} ${esc(c.shop.address.ja.region + c.shop.address.ja.locality + c.shop.address.ja.street)}<br>${esc(c.shop.name.ja)}</span>`
              : ""
          }</dd></div>
          <div><dt>${esc(A.nearest)}</dt><dd>${esc(c.shop.access[lang])}<br>${esc(c.shop.landmark[lang])}${directions}</dd></div>
          <div><dt>${esc(A.hours)}</dt><dd>${esc(hoursText(lang, c))}</dd></div>
          <div><dt>${esc(A.closed)}</dt><dd>${esc(c.hours.closed[lang])}<br><span class="note">${esc(c.hours.note[lang])}</span>${insta}</dd></div>
          <div><dt>${esc(A.seating)}</dt><dd>${esc(A.seatingText)}</dd></div>
          <div><dt>${esc(A.payment)}</dt><dd>${esc(c.payment[lang])}<br><span class="note">${esc(c.payment.note[lang])}</span></dd></div>
          <div><dt>${esc(A.tel)}</dt><dd><a class="num" href="${telHref(c.shop.tel)}">${esc(c.shop.tel)}</a></dd></div>
        </dl>
      </div>
    </section>`;
}

export function footer(lang, c, ctx, t) {
  const logo = ctx.sizes["assets/img/logo-sumi.png"];
  const wh = logo ? ` width="${logo.width}" height="${logo.height}"` : "";
  return `<footer class="site-footer on-light">
    <img class="footer-logo" src="${ctx.base}assets/img/logo-sumi.png" alt="${esc(c.shop.shortName.ja)}"${wh} loading="lazy" decoding="async"${lang === "en" ? ' lang="ja"' : ""}>
    <p class="award">${esc(c.shop.award[lang])}</p>
    <p class="copyright">© <span data-year>${ctx.buildYear}</span> ${esc(c.shop.name[lang])}</p>
    <p class="footer-lang"><a href="${esc(ctx.langHref)}" hreflang="${t.langSwitch.lang}" lang="${t.langSwitch.lang}">${esc(t.langSwitch.label)}</a></p>
  </footer>`;
}

export function reserveUI(lang, c, ctx, t, { onTop = true, target = onTop ? "#reserve" : `${ctx.home}#reserve`, tel = c.shop.tel } = {}) {
  return `<div class="reserve-bar">
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-list" data-open="${esc(t.menuOpen)}" data-close="${esc(t.menuClose)}">${esc(t.menuOpen)}</button>
    <a href="${telHref(tel)}">${esc(t.bar.tel)}</a>
    <a href="${target}">${esc(t.bar.reserve)}</a>
  </div>
  <a class="reserve-float" href="${target}">${esc(t.floatReserve)}<span class="num">${esc(tel)}</span></a>`;
}

// ---------------------------------------------------------------- ページ
export function homePage(lang, c, ctx) {
  const t = copy(lang, c);
  return `${head(lang, c, ctx, t, { intro: true })}
<body>
  <a class="skip" href="#main">${esc(t.skip)}</a>
  ${notice(lang, c, ctx)}
  ${header(lang, c, ctx, t)}
  ${reserveUI(lang, c, ctx, t)}
  <main id="main">
    ${hero(lang, c, ctx, t)}
    ${omakase(lang, c, ctx, t)}
    ${utsuwa(lang, c, ctx, t)}
    ${seats(lang, c, ctx, t)}
    ${kitchen(lang, c, ctx, t)}
    ${reserve(lang, c, ctx, t)}
    ${access(lang, c, ctx, t)}
  </main>
  ${footer(lang, c, ctx, t)}
  <script src="${ctx.base}assets/js/site.js" defer></script>
</body>
</html>
`;
}
