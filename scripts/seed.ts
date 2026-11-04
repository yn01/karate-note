// 合成データ（data/seed/*.json）を DB に入れる。何度流しても同じ結果になる。
// 使い方：npm run db:seed（.env.local の DATABASE_URL を使う）。中身は src/db/seed-core.ts
import { createDb } from "../src/db/client";
import { seedAll } from "../src/db/seed-core";

seedAll(createDb())
  .then(({ counts }) => console.log("シード完了（架空の合成データ）", counts))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
