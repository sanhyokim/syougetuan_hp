// 小さな道具。外部ライブラリは使わない。
import { readFileSync, existsSync } from "node:fs";

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// {{token}} を値に置き換える
export const fill = (text, tokens) =>
  String(text).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in tokens ? String(tokens[k]) : m));

const KANJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export function kanjiNumber(n) {
  n = Number(n);
  if (n < 10) return KANJI[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (tens > 1 ? KANJI[tens] : "") + "十" + (ones ? KANJI[ones] : "");
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
export const englishNumber = (n) => WORDS[n] ?? String(n);
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// "18:00" → 十八時 / "18:30" → 十八時半
export function kanjiTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  if (m === 0) return `${kanjiNumber(h)}時`;
  if (m === 30) return `${kanjiNumber(h)}時半`;
  return `${kanjiNumber(h)}時${kanjiNumber(m)}分`;
}

// "18:00" → six in the evening / "18:30" → half past six in the evening
export function englishTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  const part = h < 12 ? "in the morning" : h < 17 ? "in the afternoon" : "in the evening";
  const base = englishNumber(h12);
  if (m === 0) return `${base} ${part}`;
  if (m === 30) return `half past ${base} ${part}`;
  return `${h12}:${String(m).padStart(2, "0")} ${part}`;
}

// "18:00" → 6:00 pm
export function clock12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export const yen = (n) => Number(n).toLocaleString("en-US");

// JPEG / PNG の縦横を読み取る（読み込み時のガタつき防止に width / height を出すため）
export function imageSize(file) {
  if (!file || !existsSync(file)) return null;
  const b = readFileSync(file);
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}
