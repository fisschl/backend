import { DuckDBConnection } from "@duckdb/node-api";

const attachDucklake = async () => {
  const connection = await DuckDBConnection.create();
  const { DUCKLAKE_POSTGRES } = Bun.env;
  const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = Bun.env;
  if (!S3_ENDPOINT) throw new Error("S3_ENDPOINT IS NOT SET");
  const [bucket, ...endpoints] = S3_ENDPOINT.split(".");
  const [region] = endpoints;
  const endpoint = endpoints.join(".");
  await connection.run(`
    INSTALL ducklake;
    INSTALL postgres;

    CREATE SECRET ducklake_s3_secret (
      TYPE s3,
      PROVIDER config,
      KEY_ID '${S3_ACCESS_KEY_ID}',
      SECRET '${S3_SECRET_ACCESS_KEY}',
      ENDPOINT '${endpoint}',
      REGION '${region}'
    );

    CREATE SECRET ducklake_secret (
    	TYPE DUCKLAKE,
	    METADATA_PATH 'postgres:${DUCKLAKE_POSTGRES}',
      DATA_PATH 's3://${bucket}/ducklake/'
    );

    ATTACH 'ducklake:ducklake_secret' AS ducklake;
  `);

  return connection;
};

/**
 * 性能测试工具函数
 */
const measureQueryPerformance = async (connection: any, query: string, description: string) => {
  const startTime = performance.now();

  try {
    const result = await connection.run(query);
    const data = await result.getRowObjectsJS();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`\n=== ${description} ===`);
    console.log(`执行时间: ${duration.toFixed(2)}ms`);
    console.log(`返回记录数: ${data.length}`);

    if (data.length > 0 && data.length <= 5) {
      console.log("查询结果:");
      data.forEach((row: any, index: number) => {
        // 处理 BigInt 序列化问题
        const safeRow = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === "bigint" ? value.toString() : value,
          ]),
        );
        console.log(`  ${index + 1}. ${JSON.stringify(safeRow, null, 2)}`);
      });
    } else if (data.length > 5) {
      console.log("前3条结果:");
      data.slice(0, 3).forEach((row: any, index: number) => {
        // 处理 BigInt 序列化问题
        const safeRow = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === "bigint" ? value.toString() : value,
          ]),
        );
        console.log(`  ${index + 1}. ${JSON.stringify(safeRow, null, 2)}`);
      });
    }

    return { duration, recordCount: data.length, success: true };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`\n=== ${description} ===`);
    console.log(`执行时间: ${duration.toFixed(2)}ms`);
    console.log(`错误: ${(error as Error).message}`);
    return { duration, recordCount: 0, success: false, error };
  }
};

/**
 * 查询测试功能
 */
const testQueries = async () => {
  console.log("=== 开始查询性能测试 ===");

  const connection = await attachDucklake();

  // 检查表是否存在
  console.log("检查表是否存在...");
  const tableCheck = await connection.run(`
    SELECT COUNT(*) as count FROM ducklake.chinese_classical
  `);
  const tableData = await tableCheck.getRowObjectsJS();
  const totalRecords = tableData[0]?.count || 0;
  console.log(`表中总记录数: ${totalRecords}`);

  if (totalRecords === 0) {
    console.log("表中没有数据，请先导入数据");
    return;
  }

  const performanceResults: any[] = [];

  // 1. 基础查询测试
  const basicQuery = await measureQueryPerformance(
    connection,
    `SELECT * FROM ducklake.chinese_classical LIMIT 10`,
    "基础查询 - 获取前10条记录",
  );
  performanceResults.push(basicQuery);

  // 2. 计数查询测试
  const countQuery = await measureQueryPerformance(
    connection,
    `SELECT COUNT(*) as total FROM ducklake.chinese_classical`,
    "计数查询 - 统计总记录数",
  );
  performanceResults.push(countQuery);

  // 3. 条件查询测试
  const conditionQuery = await measureQueryPerformance(
    connection,
    `SELECT id, title FROM ducklake.chinese_classical WHERE title LIKE '%史记%' OR title LIKE '%史記%' LIMIT 5`,
    "条件查询 - 查找标题包含'史记'的记录",
  );
  performanceResults.push(conditionQuery);

  // 4. 文本搜索测试
  const textSearchQuery = await measureQueryPerformance(
    connection,
    `SELECT id, title FROM ducklake.chinese_classical WHERE text LIKE '%项羽%' OR text LIKE '%項羽%' LIMIT 5`,
    "文本搜索 - 在内容中搜索'项羽'",
  );
  performanceResults.push(textSearchQuery);

  // 4.5. 查看一些示例数据
  const sampleDataQuery = await measureQueryPerformance(
    connection,
    `SELECT id, title, LEFT(text, 100) as text_preview FROM ducklake.chinese_classical LIMIT 3`,
    "示例数据查看 - 查看前3条记录",
  );
  performanceResults.push(sampleDataQuery);

  // 5. 聚合查询测试
  const aggregateQuery = await measureQueryPerformance(
    connection,
    `SELECT
       COUNT(*) as total_records,
       COUNT(DISTINCT title) as unique_titles,
       AVG(LENGTH(text)) as avg_text_length
     FROM ducklake.chinese_classical`,
    "聚合查询 - 统计信息",
  );
  performanceResults.push(aggregateQuery);

  // 6. 排序查询测试
  const sortQuery = await measureQueryPerformance(
    connection,
    `SELECT id, title, LENGTH(text) as text_length
     FROM ducklake.chinese_classical
     ORDER BY LENGTH(text) DESC
     LIMIT 5`,
    "排序查询 - 按文本长度排序",
  );
  performanceResults.push(sortQuery);

  // 7. 分组查询测试
  const groupQuery = await measureQueryPerformance(
    connection,
    `SELECT
       CASE
         WHEN LENGTH(text) < 1000 THEN '短文本'
         WHEN LENGTH(text) < 5000 THEN '中等文本'
         ELSE '长文本'
       END as text_category,
       COUNT(*) as count
     FROM ducklake.chinese_classical
     GROUP BY text_category`,
    "分组查询 - 按文本长度分组统计",
  );
  performanceResults.push(groupQuery);

  // 8. 复杂查询测试
  const complexQuery = await measureQueryPerformance(
    connection,
    `SELECT
       id,
       title,
       LENGTH(text) as text_length,
       CASE
         WHEN text LIKE '%史记%' THEN '史记相关'
         WHEN text LIKE '%汉书%' THEN '汉书相关'
         WHEN text LIKE '%三国%' THEN '三国相关'
         ELSE '其他'
       END as category
     FROM ducklake.chinese_classical
     WHERE LENGTH(text) > 1000
     ORDER BY text_length DESC
     LIMIT 10`,
    "复杂查询 - 多条件筛选和分类",
  );
  performanceResults.push(complexQuery);

  // 性能统计
  console.log("\n=== 性能统计汇总 ===");
  const successfulQueries = performanceResults.filter((r) => r.success);
  const failedQueries = performanceResults.filter((r) => !r.success);

  if (successfulQueries.length > 0) {
    const avgDuration =
      successfulQueries.reduce((sum, r) => sum + r.duration, 0) / successfulQueries.length;
    const minDuration = Math.min(...successfulQueries.map((r) => r.duration));
    const maxDuration = Math.max(...successfulQueries.map((r) => r.duration));

    console.log(`成功查询数: ${successfulQueries.length}`);
    console.log(`失败查询数: ${failedQueries.length}`);
    console.log(`平均执行时间: ${avgDuration.toFixed(2)}ms`);
    console.log(`最短执行时间: ${minDuration.toFixed(2)}ms`);
    console.log(`最长执行时间: ${maxDuration.toFixed(2)}ms`);
  }

  if (failedQueries.length > 0) {
    console.log("\n失败的查询:");
    failedQueries.forEach((query, index) => {
      console.log(`  ${index + 1}. ${query.error?.message || "未知错误"}`);
    });
  }

  console.log("\n查询性能测试完成！");
};

await testQueries();
