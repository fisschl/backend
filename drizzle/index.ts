import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

const { DATABASE_URL } = Bun.env;

export const sql = new SQL(DATABASE_URL!);
export const db = drizzle(sql);
