import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { env } from "node:process";

const { DATABASE_URL } = env;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL!,
  },
});
