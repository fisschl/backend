import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "SUPER_ADMIN"]);

// 用户表
export const users = pgTable(
  "users",
  {
    user_id: uuid("user_id").primaryKey(),
    user_name: varchar("user_name", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: userRoleEnum("role").default("USER"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_user_name_idx").on(table.user_name),
  ],
);

// 令牌表
export const tokens = pgTable(
  "tokens",
  {
    token: varchar("token", { length: 255 }).primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.user_id),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tokens_user_id_idx").on(table.user_id),
    index("tokens_created_at_idx").on(table.created_at),
  ],
);

// 定义关系
export const usersRelations = relations(users, ({ many }) => ({
  tokens: many(tokens),
}));

export const tokensRelations = relations(tokens, ({ one }) => ({
  user: one(users, {
    fields: [tokens.user_id],
    references: [users.user_id],
    onDelete: "cascade",
  }),
}));
