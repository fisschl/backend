import { drizzle } from "drizzle-orm/bun-sql";

const { DATABASE_URL } = Bun.env;
export const db = drizzle(DATABASE_URL!);
