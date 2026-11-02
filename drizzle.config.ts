import { defineConfig } from "drizzle-kit";

// drizzle-kit は .env.local を自動で読まないので、ここで読む
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local がなくても generate は動く（migrate には必要）
}

// migrate・push などDBにつなぐコマンドでは、DATABASE_URL がないと先に止める
const needsDb = process.argv.some((a) => ["migrate", "push", "pull", "studio"].includes(a));
if (needsDb && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL がありません。.env.local に設定してください（.env.example を参照）。");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
