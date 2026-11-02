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
