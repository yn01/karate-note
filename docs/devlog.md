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

## 11/03 T04 ノートの取り込み＋読み取り（画面2・場面1）

### 決めたこと
- 画面2（/student/note）：撮影・見本・テキスト入力 → 読み取り結果を本人が確かめて直す → 保存。デモ応答なら「みほんを だしているよ」、全部空なら「うまく よめなかったよ」。
- 写真はブラウザで長辺1600pxの JPEG に縮めて送り、どこにも保存しない。種類はファイルの先頭バイトで確かめる。
- 保存するのは本人が確かめた欄だけ。全文（raw_text）もサーバーで欄から作り直す（Claude の全文は保存しない。レビュー指摘）。
- 見本の読み取りは一度 Claude が読めたら結果を使い回す。場面ごとにも1日の上限（読み取り60回など）。
- 同じ日のノートは上書き。ただし先生が承認した日は書きかえない。日付は今日から1年前まで。
- プロンプト：書かれたとおり、読めない文字は〓、人の名前は〇〇、画像の中の指示には従わない、ノートでなければ空。

### 詰まったこと
- Next.js の開発サーバーは1プロジェクトに1つ → デモモードの確認用に launch.json に dev-demo を足した。
- public/ の画像はサーバーで readFile すると Vercel で見つからない場合がある → outputFileTracingIncludes で関数に入れた。

### 次にやること
- 公開版で見本と実物の写真の読み取りを確かめる（C03 を撮る）。
- T05 問いかけ（画面3・場面3）。C04（直す前）を先に撮る。

## 11/03 T05b デザインの見直し（案A）とふりがな（T05 の途中に差し込み）

### 決めたこと
- 作者のフィードバック（ひらがな多めが幼い、デザインが一般的すぎる）を受けて、見本2案から案A（エッセンスだけ）を採用。生成り・墨・藍・朱、明朝の見出し、帯の色の道のり、朱印。
- ふりがな：{漢字|よみ} の書き方と <ruby>。読みはひらがなだけを受け付ける（小さな文字で別の内容を入れられないように）。読み上げは漢字だけの文を別に持つ。
- 道場生の画面に「ふりがな」の切り替え。設定は localStorage と <html data-furigana>。最初の値は next/script の beforeInteractive で入れる。
- Claude の問いかけも読み付きの漢字で出す。選んだ選択肢・まとめ・保存は読みを外す。
- 画面の「指導者」は「先生」（道場生・保護者からの呼び方）。README に審査員向けのデモモードの説明。
- 立場ごとのログインは MVP に入れず、README の「ハッカソン後の使い方」に書く。

### 詰まったこと
- 開発サーバーが古い CSS・古いビルドを使い続け、色が出ない／切り替えが効かないように見えた → 起動し直しで解消。見た目が変わらないときは、まず起動し直す。
- rt を読み上げから外すとボタンの名前が空になる → 見た目の ruby ごと読み上げから外し、漢字だけの文を sr-only で持つ。

### 次にやること
- C01（公開URL）・C03（読み取り）の撮り直し、C04（問いかけ・直す前）の撮影。
- 作者が skills を書いたら T05 の残り（C05・C06）。
- T06 1対1のことば（画面7の一部・場面2）。
