import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "SUPER_ADMIN"]);

export const users = pgTable(
  "users",
  {
    userId: uuid("user_id").primaryKey(),
    userName: varchar("user_name", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: userRoleEnum("role").default("USER"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_user_name_idx").on(table.userName),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  tokens: many(tokens),
}));

export const tokens = pgTable(
  "tokens",
  {
    token: varchar("token", { length: 255 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tokens_user_id_idx").on(table.userId),
    index("tokens_created_at_idx").on(table.createdAt),
  ],
);

export const tokensRelations = relations(tokens, ({ one }) => ({
  user: one(users, {
    fields: [tokens.userId],
    references: [users.userId],
  }),
}));

export const poetry = pgTable("poetry", {
  id: uuid("id").primaryKey(),
  author: varchar("author", { length: 255 }).notNull(),
  title: text("title").notNull(),
  text: text("text").notNull(),
  category: varchar("category", { length: 255 }).notNull(),
});
