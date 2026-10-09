# 料理屋 昇月庵 公式サイト

年に数回の更新で回るように作っています。
**書き換えるのは、ほぼ `site.config.json` ひとつだけです。**

## 更新の流れ

1. GitHub でこのリポジトリを開き、`site.config.json` を開く
2. 右上の鉛筆マーク（Edit）を押して書き換える
3. 下の「Commit changes」を押して保存する

保存すると、GitHub が自動でページを作り直します（1〜2分）。
日本語と English のページ、検索エンジン向けの情報（構造化データ）、サイトマップがまとめて更新されます。

> 数字は半角で、`"` や `,` を消さないように気をつけてください。
> 書き方に誤りがあると作り直しが止まり、GitHub の「Actions」に理由が日本語で表示されます。

---

## 料金や営業時間の変え方

| 変えたいもの | 書き換える場所 | 例 |
|---|---|---|
| コースの料金 | `course.price` | `21780`（円・カンマなしの数字だけ） |
| 料金の注記 | `course.priceNote` | 「税込・サービス料なし」 |
| 開店・閉店・L.O. | `hours.open` / `hours.close` / `hours.lastOrder` | `"18:00"` |
| 営業する曜日 | `hours.openDays` | 英語の曜日名（`"Monday"` など） |
| 定休日の書き方 | `hours.closed` | 日本語と英語の両方 |
| キャンセル料 | `reservation.cancellation` | `dayBefore`（前日）、`sameDay`（当日）を % の数字で |
| 来店の目安 | `reservation.arriveMinutesBefore` | `5`（分） |
| 予約の規定の文章 | `reservation.policy` | 日本語と英語の両方。`{{cancelDayBefore}}` などは数字が自動で入る |
| 電話番号 | `shop.tel` / `shop.telIntl` | 国内向けと海外向け |
| 予約サイトの URL | `reservation.url` | 日本語用と英語用 |

開店時刻を変えると、トップの「十八時、暖簾を掛けます。」も自動で変わります。

## 季節写真の差し替え方

トップの写真は、見ている月で自動で切り替わります（3〜5月 春／6〜8月 夏／9〜11月 秋／12〜2月 冬）。
いまは四季とも暖簾の写真が入っています。差し替えなくても成り立ちます。

1. 写真を `assets/img/` にアップロードする（横長 1600px 前後の JPEG がおすすめ。例：`hero-winter.jpg`）
2. `site.config.json` の `seasons.winter.hero.src` を `"assets/img/hero-winter.jpg"` に変える
3. スマホでは写真の一部を正方形に切り出します。左右のどこを見せるかは `positionMobile` で決めます
   （`"50% 50%"` が中央、`"20% 50%"` で左寄り、`"80% 50%"` で右寄り）

季節写真の背景の色（十八時の空の暗さ）は、写真と関係なく季節で自動に変わります。

ほかの写真は `photos` で同じように差し替えます（`omakase` がおまかせ、`utsuwa` が器と盛り、`seats` がカウンター、`kitchen` が板場、`entrance` がアクセスの入口の写真）。
**料理長とおかみの写真**は、`photos.kitchen.src` に写真の場所を書くと「写真を準備中です」の枠と入れ替わります。
写真を変えたら、`alt`（写真の説明文）も日本語と英語で書き換えてください。

## 季節ページ（おせちなど）の公開・非公開

`site.config.json` の `seasonalPage.state` を書き換えます。

| 値 | トップの告知帯 | ナビのリンク | ページ（/osechi/） | サイトマップ |
|---|---|---|---|---|
| `"off"`（いまの状態） | 出さない | 出さない | 作らない（以前のものも消す） | 載せない |
| `"open"` | 出す | 出す | 作る（電話・予約の案内つき） | 載せる |
| `"closed"` | 出さない | 出さない | 作る（「締め切りました」と表示） | 載せる |

告知帯の文は `seasonalPage.notice`、ページの本文は `seasonalPage.body` です。

---

## まだ埋まっていない項目

空のままでも表示は崩れません。埋めるとその場所に出ます。

| 項目 | 場所 | 出る場所 |
|---|---|---|
| ごあいさつの文（いまは下書き） | `greeting.ja` / `greeting.en` の `lead`・`body` | トップのすぐ後 |
| 店名の由来・開業の年 | `greeting.<言語>.origin` | ごあいさつの本文の後 |
| 料理長のお言葉（いまは仮の文） | `chef.words` | 板場（縦書きの一文） |
| 店主の挨拶文（いまは下書き） | `chef.message` | 板場の写真の下 |
| お飲み物 | `course.drinks` | おまかせ |
| 素材の産地・仕入れ先 | `course.sources` | おまかせ |
| 季節の炊き込みご飯の一行 | `seasons.<季節>.rice` | おまかせ |
| 記念日にできること | `shop.celebration` | カウンター（貸切の一行の下） |
| 電話の受付時間 | `reservation.phoneHours` | ご予約（English は日本時間と書く） |
| 何か月先まで受けるか | `reservation.bookingWindow` | ご予約 |
| 始まりの時刻 | `reservation.start` | ご予約 |
| お時間（所要時間） | `reservation.duration` | ご予約 |
| 海外からの予約方法 | `reservation.overseas.en` | English のご予約 |
| 電停からの道順 | `shop.directions`（一行ずつ） | アクセス |
| 駐車場 | `shop.parking` | アクセス |
| Instagram の URL | `shop.instagram`（臨時休業のお知らせ先として表示） | アクセス |
| 独自ドメイン | `siteUrl`（いまは GitHub Pages の URL） | — |

ごあいさつの文の中に `{{seats}}` と書くと、席数（`shop.seats`）が「七席」「seven」の形で入ります。

## 公開のしかた（GitHub Pages）

Settings → Pages → 「Deploy from a branch」で、公開するブランチと `/ (root)` を選びます。
独自ドメインにする場合は、`siteUrl` もそのドメインに書き換えてください。

## 手元で確かめたいとき

```sh
node build.mjs                  # ページを作り直す（Node.js 18 以上）
python3 -m http.server 8000     # http://localhost:8000 で表示
```

## ファイルの構成

```
site.config.json   店舗情報・料金・営業時間・予約の規定・写真・季節ページ（ここを書き換える）
build.mjs          site.config.json からページを作る
src/               ページの雛形（copy.mjs が地の文、templates.mjs が HTML）
assets/            CSS・JavaScript・画像
index.html ほか    生成されたページ（直接書き換えない。作り直すと上書きされます）
DESIGN.md          配色・書体・余白・動き・禁止事項
```
