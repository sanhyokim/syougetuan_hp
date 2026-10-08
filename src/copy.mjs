// ページの地の文。店舗情報・料金・規定は site.config.json から差し込む。
// 年が変わると古くなる言葉（「本年」や固定の年号）は書かない。
import { kanjiNumber, kanjiTime, englishNumber, englishTime, capitalize } from "./util.mjs";

export function copy(lang, c) {
  return copyText(lang, c);
}

function copyText(lang, c) {
  const seats = c.shop.seats;
  if (lang === "ja") {
    const seatsKanji = `${kanjiNumber(seats)}席`;
    return {
      title: `${c.shop.name.ja}｜広島・小町のカウンター割烹`,
      description: `広島市中区小町、カウンター${seatsKanji}の割烹。瀬戸内の魚介と広島の季節の素材による、おまかせのコースのみ。完全予約制。`,
      skip: "本文へ移動",
      navLabel: "サイト内",
      menuOpen: "目次",
      menuClose: "閉じる",
      langSwitch: { label: "English", lang: "en" },
      heroLine: `${kanjiTime(c.hours.open)}、暖簾を掛けます。`,
      nav: { omakase: "おまかせ", kitchen: "板場", utsuwa: "器と盛り", seats: "カウンター", reserve: "ご予約", access: "アクセス" },
      seats: {
        heading: "カウンター",
        lead: `暖簾の内は、白木の${seatsKanji}だけ。`,
        body: ["まな板を挟んで、料理長と向き合う席です。目の前で仕上げた一皿を、その場でお出しします。完全予約制です。"],
      },
      omakase: {
        heading: "おまかせ",
        lead: "料理は、おまかせのコースひとつだけです。",
        body: [
          `瀬戸内の魚介と広島の季節の素材を中心に、${c.course.dishes.ja}を順にお出しします。`,
          "高価な食材に頼るのではなく、ひとつの素材の持ち味に、もうひとつの素材を重ねて一皿を組み立てます。",
        ],
        rice: "名物は、世羅の米で炊く季節の炊き込みご飯です。",
        yen: "円",
      },
      utsuwa: {
        heading: "器と盛り",
        body: ["料理に合わせて器を選び、器に合わせて盛りを決めます。", "蓋を取ったとき、器の絵と料理が、ひとつの景色になるように。"],
      },
      kitchen: { heading: "板場", placeholder: "写真を準備中です" },
      reserve: {
        heading: "ご予約",
        lead: "ご予約は、お電話または予約サイトで承ります。",
        telLabel: "お電話",
        site: "予約サイトで空席を見る",
        newTab: "（新しいタブで開きます）",
        policyLead: "ご予約にあたって、お願いしていることがございます。",
      },
      access: {
        heading: "アクセス",
        address: "所在地",
        nearest: "最寄り",
        hours: "営業時間",
        closed: "定休日",
        seating: "お席",
        seatingText: `カウンター${seats}席（完全予約制）`,
        payment: "お支払い",
        tel: "お電話",
        map: `地図：${c.shop.name.ja}`,
        mapLink: "Google マップで開く",
        instagram: "臨時の営業・休業は Instagram でお知らせします",
      },
      bar: { tel: "電話する", reserve: "ご予約" },
      floatReserve: "ご予約",
      toTop: "トップへ",
    };
  }

  const seatsWord = englishNumber(seats);
  return {
    title: `${c.shop.name.en} | Counter kappo in Komachi, Hiroshima`,
    description: `A ${seatsWord}-seat counter kappo in Komachi, Hiroshima. One omakase course of seafood from the Seto Inland Sea and the seasons of Hiroshima. Reservations only.`,
    skip: "Skip to content",
    navLabel: "Site",
    menuOpen: "Menu",
    menuClose: "Close",
    langSwitch: { label: "日本語", lang: "ja" },
    heroLine: `At ${englishTime(c.hours.open)}, the noren goes up.`,
    nav: { omakase: "Omakase", kitchen: "Kitchen", utsuwa: "Vessels", seats: "Counter", reserve: "Reservations", access: "Getting here" },
    seats: {
      heading: "The counter",
      lead: `Inside the noren, ${seatsWord} seats at a plain wooden counter, and no more.`,
      body: ["You sit facing the chef across the cutting board. Each dish is finished in front of you and served on the spot. Reservations only."],
    },
    omakase: {
      heading: "Omakase",
      lead: "There is one menu: the omakase course.",
      body: [
        `${capitalize(c.course.dishes.en)}, built on seafood from the Seto Inland Sea and the seasons of Hiroshima.`,
        "Rather than lining up costly ingredients, the chef builds each dish by layering one ingredient’s character onto another’s.",
      ],
      rice: "Our signature is a seasonal rice dish, cooked in the pot with rice grown in Sera, Hiroshima.",
      yen: "",
    },
    utsuwa: {
      heading: "Vessel and plating",
      body: ["Vessels are chosen for the food, and the plating for the vessel.", "When the lid comes off, the painting on the bowl and the food in it should read as one scene."],
    },
    kitchen: { heading: "The kitchen", placeholder: "Photograph coming soon" },
    reserve: {
      heading: "Reservations",
      lead: "Reservations are taken by phone or through our booking site.",
      telLabel: "Telephone",
      telAbroad: "From outside Japan",
      site: "Check availability and book online",
      newTab: " (opens in a new tab)",
      policyLead: "Before you book, please read the following.",
    },
    access: {
      heading: "Getting here",
      address: "Address",
      nearest: "Nearest stop",
      hours: "Hours",
      closed: "Closed",
      seating: "Seating",
      seatingText: `${capitalize(seatsWord)} counter seats, reservations only`,
      payment: "Payment",
      tel: "Telephone",
      map: `Map: ${c.shop.name.en}`,
      mapLink: "Open in Google Maps",
      instagram: "Irregular openings and closures are posted on Instagram",
      taxi: "In Japanese, to show a taxi driver",
    },
    bar: { tel: "Call", reserve: "Reservations" },
    floatReserve: "Reservations",
    toTop: "Top",
  };
}
