import { db } from "@/drizzle";
import { megaScience } from "@/drizzle/schema";
import { validate } from "@/utils/zod";
import { asc, count, desc, eq } from "drizzle-orm";
import { H3 } from "h3";
import { z } from "zod";

export const PaginationZod = z.object({
  pageNumber: z.number(),
  pageSize: z.number(),
});

export const SelectMegaScienceParamsZod = z.object({
  pagination: PaginationZod.optional(),
  orderBy: z.enum(["id", "subject"]).optional(),
  orderDirection: z.enum(["asc", "desc"]).optional(),
  subject: z.string().optional(),
});

export const duckRouter = new H3().post("/megaScience", async (event) => {
  const body = validate(await event.req.json(), SelectMegaScienceParamsZod);

  const { pageNumber = 1, pageSize = 64 } = body.pagination ?? {};
  const { orderBy = "id", orderDirection = "asc", subject } = body;

  // 构建 where 条件
  const whereCondition = subject ? eq(megaScience.subject, subject) : undefined;

  // 获取总数
  const [totalResult] = await db.select({ total: count() }).from(megaScience).where(whereCondition);
  const total = totalResult?.total || 0;

  // 构建排序列
  const orderByColumn = orderBy === "id" ? megaScience.id : megaScience.subject;
  const orderDirectionFn = orderDirection === "desc" ? desc : asc;

  // 获取数据
  const limit = pageSize;
  const offset = (pageNumber - 1) * pageSize;

  const data = await db
    .select()
    .from(megaScience)
    .where(whereCondition)
    .orderBy(orderDirectionFn(orderByColumn))
    .limit(limit)
    .offset(offset);

  return { data, total };
});
