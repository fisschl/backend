import { db } from "@/drizzle";
import { poetry } from "@/drizzle/schema";
import { like, or } from "drizzle-orm";

// 定义非常规符号的正则表达式及其检测方法
const abnormalPatterns = [
  { key: "斜杠", pattern: "%/%", test: /\// },
  { key: "反斜杠", pattern: "%\\%", test: /\\/ },
  { key: "英文字母", pattern: "%[A-Za-z]%", test: /[A-Za-z]/ },
  { key: "数字", pattern: "%[0-9]%", test: /[0-9]/ },
];

async function main() {
  // 构建所有字段的 like 查询
  const wheres = [];
  for (const { pattern } of abnormalPatterns) {
    wheres.push(like(poetry.author, pattern));
    wheres.push(like(poetry.title, pattern));
    wheres.push(like(poetry.text, pattern));
    wheres.push(like(poetry.category, pattern));
  }
  const results = await db
    .select()
    .from(poetry)
    .where(or(...wheres));

  // 依次输出结果，精确到字段和匹配的字符类型
  console.log("包含非常规符号的记录：");
  results.forEach((row, idx) => {
    const matchFields = [];
    for (const field of ["author", "title", "text", "category"] as const) {
      for (const abnormal of abnormalPatterns) {
        const value = row[field];
        if (typeof value === "string" && abnormal.test.test(value)) {
          matchFields.push(`${field} 含有${abnormal.key}`);
        }
      }
    }
    if (matchFields.length > 0) {
      console.log(`第${idx + 1}条:`, row);
      console.log("  匹配详情:", matchFields.join("，"));
    }
  });
}

main().catch((err) => {
  console.error("查询异常：", err);
});
