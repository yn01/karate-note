# 空手ノート（karate-note）

空手道場の紙の「空手ノート」を、道場生・保護者・先生（指導者）の3者をつなぐ仕組みにする Web アプリ。Built with Claude: Japan 2026 の提出作品。

> ⚠️ **このアプリのデータはすべて架空です。** 登場する道場生・保護者は実在の人物ではありません。

## 触ってみる（審査員の方へ）

**公開 URL：https://karate-note.vercel.app/** （ログイン不要のデモモード。スマホでの表示を想定しています）

1. 開くと、道場生「たくやくん」（架空・小4・10級 水色帯）のホームが出ます。黒帯への道のりと現在地、今日のテーマを見られます。
2. 画面上部の「道場生／保護者／先生」で、3つの立場を行き来できます（先生＝指導者の画面）。
3. 画面のいちばん上（切り替えバーの上）に「架空のデータです（デモ）」と出ています。
4. ホームの「ノートを取りこむ」→「見本のノートを使う」で、架空の手書きノート（11月1日）を Claude が読み取ります。結果を確かめて直し、保存できます。スマホなら「ノートを撮る」でカメラも使えます（写真はどこにも保存しません）。
5. ホームの「ふりかえりの質問」で、Claude の問いかけ（オープン質問 → 選択肢のある質問 → まとめ）を体験できます。道場生の画面は漢字にふりがな付きで、右上の「ふりがな」で切り替えられます。
6. 上の「先生」→「たくやくんのノートを確認する」で、1対1のことば（稽古のあとに先生が話したこと）を「話して入力」または「見本のことばを入れる」で入れ、Claude が要点に整理します。先生が直して確定します。

> **デモモードについて**
> 審査のために、ログインなしで3つの立場の画面をすべて見られるようにしています。上の切り替えバーは、このデモのためのものです。
> 実際に使うときは、道場生・保護者・先生がそれぞれログインし、自分の画面だけを見ます。保護者には自分の子どものお便りだけ、道場生には自分のノートだけが表示されます。どの立場でも、Claude の下書きは先生が直して承認するまで、道場生と保護者には届きません。

| 立場 | URL | いまできること |
| --- | --- | --- |
| 道場生 | [/student](https://karate-note.vercel.app/student) | 黒帯への道のり・現在地・今日のテーマ、ノートの取り込み（[/student/note](https://karate-note.vercel.app/student/note)）、ふりかえりの質問（[/student/question](https://karate-note.vercel.app/student/question)） |
| 保護者 | [/parent](https://karate-note.vercel.app/parent) | 準備中（今週のお便り） |
| 先生（指導者） | [/coach](https://karate-note.vercel.app/coach) | ノートの確認（[/coach/review](https://karate-note.vercel.app/coach/review)）：1対1のことばの入力と整理。一覧・下書き・承認は準備中 |

（機能が増えたら、この表と手順を更新します。）

## プライバシーの方針（1対1のことば）

- 音声はこのアプリには送られず、保存もしません。文字にする処理はブラウザ・OS の音声認識が行い（Chrome は Google、Safari は Apple のサーバーを使うことがあります）、このアプリには文字だけが届きます。
- デモでは、先生の声だけを文字にしています（道場生の声は入れていません）。
- 実際に使うときは、本人と保護者の同意を得てから使います。子どもの発言は要点だけを残し、そのまま長く記録しません。いまのデモでは先生が話した文字起こしを全文保存しているので、実運用では文字起こしを整理のあとに消す・短く保つなどに見直します。
- 端末の中だけで文字にできる音声認識（オンデバイス）が使えるブラウザでは、それを使うことを検討します。
- Claude が整理した内容は先生の画面だけに表示され、先生が直して承認したお便りだけが保護者と道場生に届きます。

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
cp .env.example .env.local   # DATABASE_URL（Neon）と ANTHROPIC_API_KEY を入れる
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
| `npm run claude:smoke` | Claude の呼び出しの土台を確かめる（本物1回・デモモード・上限） |

## Claude の使い分け

Claude を呼ぶ場面は5つです。モデルと effort は [src/lib/claude/models.ts](src/lib/claude/models.ts) の1か所にまとめています。出力はすべて構造化出力（JSON、zod のスキーマは [src/lib/claude/schemas.ts](src/lib/claude/schemas.ts)）です。

| 場面 | モデル | effort | 選んだ理由 |
| --- | --- | --- | --- |
| 1 ノートの読み取り | Claude Opus 5.5（`claude-opus-5-5`） | low | 手書きの画像を読む力 |
| 2 1対1のことばの整理 | Claude Haiku 5.5（`claude-haiku-5-5`） | low | 短いテキストの整理。速さ優先 |
| 3 問いかけ | Claude Sonnet 5.5（`claude-sonnet-5-5`） | low | 子どもを待たせない速さと、答えを教えない指示を守る力 |
| 4 下書き | Claude Opus 5.5（`claude-opus-5-5`） | high | 育成計画と形の知見を踏まえて考える |
| 5 点検 | Claude Opus 5.5（`claude-opus-5-5`） | medium | 下書きとは別の呼び出しで、原則に反していないかを確かめる |

### 守り

- 5場面はすべて共通の入口 `callScene()`（[src/lib/claude/call.ts](src/lib/claude/call.ts)）を通ります。
- 次のときは Claude を呼ばず（または呼んだ結果を使わず）、**保存済みのデモ応答**（[data/seed/demo-responses.json](data/seed/demo-responses.json)）で画面を続けます。
  - 1日（日本時間）に API まで届いた呼び出しの回数が `CLAUDE_DAILY_LIMIT`（既定 200）に達したとき。回数は DB の `claude_calls` で数えます（プロンプトや出力の中身は残しません）
  - API の障害・時間切れ・混雑、出力が形に合わないとき、断られたとき（Opus・Sonnet はサーバー側の fallback で別のモデルが先に試します）
  - `ANTHROPIC_API_KEY` がないとき、`CLAUDE_MODE=demo` のとき
- API キーはサーバー側の環境変数だけで読み、ブラウザに渡るコードからは読み込めません（`server-only`）。
- デモ応答で続けたときは、画面に「保存済みのデモ応答です」と出します。点検（場面5）のデモ応答は「点検できなかった」として返すので、点検していない下書きが「問題なし」に見えることはありません。
- 到達基準の状態（まだ／ときどき／安定）は指導者が付けたものだけを使います。Claude は状態を判定せず、照らし合わせのコメントだけを書きます。
- Claude の出力（下書き）は、指導者が直して承認するまで道場生と保護者には届きません。

## 技術スタック

Next.js（App Router・TypeScript）、Tailwind CSS、Postgres（Neon）＋ Drizzle ORM、Claude API（Anthropic TypeScript SDK）。

要件は [docs/requirements.md](docs/requirements.md) を参照。
