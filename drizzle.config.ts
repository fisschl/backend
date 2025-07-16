import { defineConfig } from "drizzle-kit";

const { DATABASE_URL } = Bun.env;

export default defineConfig({
  out: "./drizzle/generated",
  schema: "./drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL!,
  },
});
