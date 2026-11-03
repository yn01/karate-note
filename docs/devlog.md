# 開発ログ

## 11/03 T01 雛形・DB・シード・道場生ホーム・要件書

### 決めたこと
- Next.js 16.4.4（App Router・TypeScript・Tailwind v4）。`cacheComponents` が初めから有効なので、`export const dynamic` は使わない。DB を読む部分は `<Suspense>` ＋ `await connection()`。
- DB は Neon を直接作って接続（`.env.local` の `DATABASE_URL`）。Vercel に公開するときに同じ値を環境変数に入れる。
- テーブルは plan.md「6」の10個。承認前の下書きを道場生・保護者に出さないため、`coach_reviews` に「承認済みなら final と approved_at が必須」の CHECK 制約を置き、渡してよい項目を `GuardianView`・`StudentView` の型で分けた。
- 11/1 のノートと1対1のことばは DB に入れず、`data/seed/demo-inputs.json` に置く（デモで取り込む）。想定の問いかけ・下書き・お便りは `demo-responses.json`（保存済みのデモ応答のもと）。
- 道場生ホームの「今日のテーマ」は `theme_selections` の最新。なければ最新ノートのテーマ。
- 黒帯への道のりでは、形は「つぎの めあて」（次の審査の課題）にだけ出す。10級の十二の一は合格済みの形なので出さない。
- プラグインは今あるもの（jev-dispatch・everything-claude-code）で進める。レビュー役は code-reviewer。

### 詰まったこと
- 計画書が CLAUDE.md の場所（~/Dev/karate-note-plan/）になく、~/Dev/karate-note-setup/karate-note-plan/ にあった → CLAUDE.md を直した。
- `LayoutProps` の型は `next typegen` が作るため、`tsc` だけでは型チェックが落ちる → `typecheck` を `next typegen && tsc --noEmit` にした。
- ページ内の `redirect()` は Cache Components の検証でエラーログが出続ける → `next.config.ts` の `redirects()` に移した。
- CLAUDE.md に書いた dev-gate・forge-ledger・skill-distiller がマーケットプレイスにない → 計測は metrics.md の手動記録のみ。C14 の forge-ledger のレポートは撮れない。

### 次にやること
- Vercel に公開して公開 URL を作る（C01 を撮る）。
- 画面2 ノートの取り込み（Claude 場面1：ノートの読み取り）。`src/lib/claude/` にモデルの設定をまとめる。
- skills/kata/heian-nidan.md の中身（作者が書く）。到達基準の要点の名前を criteria-checks.json と合わせる。
- 指導者一覧の「未確認」バッジの定義（承認済みの確認がないノート）を決める。

## 11/03 T02 Vercel への公開

### 決めたこと
- 公開 URL：https://karate-note.vercel.app/（作者が Vercel で GitHub から取り込み、`DATABASE_URL` を設定）。開発と同じ Neon の DB を使う。
- Hobby プランでは関数の地域を変えられず iad1（米国東部）のまま。代わりに道場生ホームの問い合わせを同時に投げ、DB との往復を5回から2回に減らした（表示は約1.2秒 → 約1.0秒）。
- 動画は外部ツールではなく Claude Code で作る（Remotion の案）。素材は ~/Dev/karate-note-video/assets/ に置き、公開リポジトリに入れない。
- タスクとスケジュールを docs/schedule.md にまとめた。

### 詰まったこと
- 関数の地域が Hobby プランで1つに限られる。さらに遅ければ、Neon を us-east-1 に作り直す。

### 次にやること
- T03 Claude の土台（モデルの設定・1日の呼び出し上限・保存済みのデモ応答）。
- 作者：skills/kata/heian-nidan.md と skills/questioning.md（11/4 朝まで）。

## 11/03 T03 Claude の土台

### 決めたこと
- モデルの割り当て（作者確認：品質寄り）：1 読み取り・4 下書き・5 点検＝Opus 5.5、2 整理＝Haiku 5.5、3 問いかけ＝Sonnet 5.5。設定は src/lib/claude/models.ts の1か所。
- 5場面とも共通の入口 `callScene()` を通す。デモモード・キーなし・上限・障害・断り・形の不一致ではデモ応答（data/seed/demo-responses.json、スキーマで検証）。
- 上限は「API まで届いた呼び出し」を claude_calls で日本時間の日ごとに数える。中身（プロンプト・出力）は残さない。
- 断られたときは Opus・Sonnet でサーバー側の fallback（`fallbacks: "default"`）を使う。
- 到達基準の状態は Claude に出させず、指導者が付けた criteria_checks を結合する（レビュー指摘で変更）。
- 点検のデモ応答は「点検できなかった」。点検していない下書きが「問題なし」に見えないようにする。
- 待ち時間の最長＝timeoutMs×（maxRetries＋1）を Vercel の関数の上限より短くする（下書き150秒・再試行なし）。

### 詰まったこと
- `messages.parse()` は形が合わないと例外を投げ、断りや途中切れと区別できない → `create()` ＋自前の JSON.parse・safeParse にした。
- server-only を読むスクリプトは `tsx --conditions=react-server` が必要。

### 次にやること
- T04 ノートの取り込み＋読み取り（画面2・場面1）。デモ応答のときは「よみとれなかったので見本を出しています」と出す。
- 作者：skills/kata/heian-nidan.md と skills/questioning.md（11/4 朝まで）。
