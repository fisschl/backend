import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { megaScience, tokens, users } from "./schema";

export const UserSelectZod = createSelectSchema(users);
export const UserInsertZod = createInsertSchema(users);
export const UserUpdateZod = createUpdateSchema(users);

export const TokenSelectZod = createSelectSchema(tokens);
export const TokenInsertZod = createInsertSchema(tokens);
export const TokenUpdateZod = createUpdateSchema(tokens);

export const MegaScienceSelectZod = createSelectSchema(megaScience);
