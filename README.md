# 空手ノート（karate-note）

空手道場の紙の「空手ノート」を、道場生・保護者・指導者の3者をつなぐ仕組みにする Web アプリ。Built with Claude: Japan 2026 の提出作品。

> ⚠️ **このアプリのデータはすべて架空です。** 登場する道場生・保護者は実在の人物ではありません。

## データの出どころ

- `data/seed/` の JSON は、**ハッカソン期間前に作った架空の合成データ**です（主役の「たくやくん」、お母さん、一覧用の5人など）。実在の道場生の情報は入れていません。
- `data/seed/belts.json`（黒帯への道のり）は、作者の道場の昇級審査科目表をもとに入力したものです。流派名は出していません。
- `public/samples/` のノート画像も、期間前に作った架空のサンプルです。

| ファイル | 中身 |
| --- | --- |
| `belts.json` | 白帯（無級）→ 10級（水色）〜 1級（茶色）→ 黒帯（初段）。級ごとの形・組手・基本・受審資格 |
| `students.json` | 道場生（たくやくん＋一覧用の5人） |
| `development-plan.json` | たくやくんの育成計画（本人の目標・保護者の願い・マイルストーン・今期の重点・強み） |
| `notes.json` | 過去3週分のノート（サンプル画像と同じ）と、一覧の「未確認」用の短いノート |
| `criteria-checks.json` | 平安二段の到達基準のチェック（指導者が付けたもの） |
| `theme-selections.json` | 11月1日の「今日のテーマ」 |
| `demo-inputs.json` | デモで取り込む11月1日のノートと、1対1のことば（指導者の声のみ）。DB には入れない |
| `demo-responses.json` | 問いかけ・下書き・お便りの想定。保存済みのデモ応答のもと。DB には入れない |

## セットアップ

必要なもの：Node.js 20.12 以上、Neon（Postgres）のデータベース。

```bash
npm install
cp .env.example .env.local   # DATABASE_URL に Neon の接続文字列を入れる
npm run db:migrate           # テーブルを作る
npm run db:seed              # 合成データを入れる（何度流しても同じ結果）
npm run dev                  # http://localhost:3000
```

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | 型チェック |
| `npm run lint` | ESLint |
| `npm run db:generate` | スキーマ（`src/db/schema.ts`）からマイグレーションを作る |
| `npm run db:migrate` | マイグレーションを DB に当てる |
| `npm run db:seed` | 合成データを入れ直す |

## 技術スタック

Next.js（App Router・TypeScript）、Tailwind CSS、Postgres（Neon）＋ Drizzle ORM、Claude API（Anthropic TypeScript SDK）。

要件は [docs/requirements.md](docs/requirements.md) を参照。
