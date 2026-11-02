import { defineConfig } from "drizzle-kit";

// drizzle-kit は .env.local を自動で読まないので、ここで読む
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local がなくても generate は動く（migrate には必要）
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
