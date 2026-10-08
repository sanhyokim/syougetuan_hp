// 日本語の段落を文節の切れ目でだけ折り返すための下ごしらえ。
// BudouX（Google, Apache-2.0）の方式で文節の切れ目を求め、そこに <wbr> を入れる。
// CSS 側は word-break: keep-all なので、どのブラウザでも <wbr> と句読点の後ろでしか改行しない。
import { model } from "./vendor/budoux-ja.mjs";

// 文節の判定が語の途中で切ってしまう語。ここに足すと、その語の中では改行しない
const NO_BREAK = ["ひとつ", "完全予約制", "まな板", "柔軟剤", "ごあいさつ", "おまかせ", "ひととき"];

const FEATURES = [
  ["UW1", -3, -2], ["UW2", -2, -1], ["UW3", -1, 0], ["UW4", 0, 1], ["UW5", 1, 2], ["UW6", 2, 3],
  ["BW1", -2, 0], ["BW2", -1, 1], ["BW3", 0, 2],
  ["TW1", -3, 0], ["TW2", -2, 1], ["TW3", -1, 2], ["TW4", 0, 3],
];
const BASE = -0.5 * Object.values(model).reduce((s, g) => s + Object.values(g).reduce((a, b) => a + b, 0), 0);
const PUNCT = "、。，．！？";
const CJK = /[぀-ヿ㐀-鿿]/;

// 文節の切れ目（文字の位置）を返す。BudouX の Parser.parseBoundaries と同じ計算
function boundaries(s) {
  const out = [];
  for (let i = 1; i < s.length; i++) {
    let score = BASE;
    for (const [key, a, b] of FEATURES) {
      if (i + a < 0) continue;
      score += model[key][s.slice(i + a, i + b)] || 0;
    }
    if (score > 0) out.push(i);
  }
  return out;
}

function breakText(text) {
  if (!CJK.test(text)) return text;
  const inside = new Set();
  for (const w of NO_BREAK) {
    for (let at = text.indexOf(w); at !== -1; at = text.indexOf(w, at + 1)) {
      for (let k = at + 1; k < at + w.length; k++) inside.add(k);
    }
  }
  const cut = new Set(boundaries(text));
  for (let i = 1; i < text.length; i++) if (PUNCT.includes(text[i - 1])) cut.add(i);
  let out = "";
  let start = 0;
  for (const i of [...cut].sort((a, b) => a - b)) {
    if (inside.has(i)) continue;
    out += text.slice(start, i) + "<wbr>";
    start = i;
  }
  return out + text.slice(start);
}

// 生成した日本語ページの段落・説明・見出しに <wbr> を入れる。縦書きの店名と料理長の言葉は対象外
export function phraseBreaks(html) {
  return html.replace(/<(p|dd|h1|h2|h3)(\s[^>]*)?>([\s\S]*?)<\/\1>/g, (all, tag, attrs = "", inner) => {
    if (/class="[^"]*\b(words|hero-name)\b/.test(attrs)) return all;
    const body = inner
      .split(/(<[^>]+>|&[#a-zA-Z0-9]+;)/)
      .map((part) => (part.startsWith("<") || part.startsWith("&") ? part : breakText(part)))
      .join("");
    return `<${tag}${attrs}>${body}</${tag}>`;
  });
}
