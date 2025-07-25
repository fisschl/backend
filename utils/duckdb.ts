import { DuckDBConnection } from "@duckdb/node-api";

const attachPostgres = async () => {
  const { DATABASE_URL } = Bun.env;
  const connection = await DuckDBConnection.create();
  const { username, password, pathname, hostname, port } = new URL(DATABASE_URL!);
  const paths = pathname
    .replace(/[/\\]+/g, " ")
    .trim()
    .split(/\s+/);
  const [dbname] = paths;
  await connection.run(
    `ATTACH 'dbname=${dbname} user=${username} password=${password} host=${hostname} port=${port}' AS db (TYPE postgres, SCHEMA 'public');`,
  );
  return connection;
};

// 性能测试函数
const measureQueryPerformance = async (
  connection: DuckDBConnection,
  query: string,
  description: string,
) => {
  const startTime = performance.now();
  const result = await connection.run(query);
  const rows = await result.getRowObjectsJS();
  const endTime = performance.now();
  const executionTime = endTime - startTime;

  console.log(`\n=== ${description} ===`);
  console.log(`执行时间: ${executionTime.toFixed(2)}ms`);
  console.log(`结果数量: ${rows.length}`);
  console.log(`查询语句: ${query}`);
  console.log(`前3条结果:`);
  console.log(rows.slice(0, 3));

  return { executionTime, rowCount: rows.length, results: rows };
};

const connection = await attachPostgres();

// 定义多种查询测试
const queries = [
  {
    description: "基础查询 - 限制2条记录",
    query: "SELECT * FROM db.poetry LIMIT 2",
  },
  {
    description: "按作者查询 - 查找特定作者的诗",
    query: "SELECT * FROM db.poetry WHERE author = '李白' LIMIT 5",
  },
  {
    description: "按类别查询 - 查找特定类别的诗",
    query: "SELECT * FROM db.poetry WHERE category LIKE '%唐%' LIMIT 5",
  },
  {
    description: "标题模糊查询 - 包含特定字的标题",
    query: "SELECT * FROM db.poetry WHERE title LIKE '%春%' LIMIT 5",
  },
  {
    description: "文本内容查询 - 包含特定字的诗句",
    query: "SELECT * FROM db.poetry WHERE text LIKE '%月%' LIMIT 5",
  },
  {
    description: "统计查询 - 按作者统计诗的数量",
    query:
      "SELECT author, COUNT(*) as count FROM db.poetry GROUP BY author ORDER BY count DESC LIMIT 10",
  },
  {
    description: "统计查询 - 按类别统计诗的数量",
    query:
      "SELECT category, COUNT(*) as count FROM db.poetry GROUP BY category ORDER BY count DESC",
  },
  {
    description: "复杂查询 - 查找特定作者在特定类别的诗",
    query: "SELECT * FROM db.poetry WHERE author = '杜甫' AND category LIKE '%唐%' LIMIT 5",
  },
  {
    description: "排序查询 - 按标题排序",
    query: "SELECT * FROM db.poetry ORDER BY title LIMIT 5",
  },
  {
    description: "去重查询 - 获取所有不重复的作者",
    query: "SELECT DISTINCT author FROM db.poetry ORDER BY author LIMIT 10",
  },
];

console.log("开始性能测试...\n");

const performanceResults = [];

// 执行所有查询并记录性能
for (const queryInfo of queries) {
  const times = [];
  let lastResult = null;
  for (let i = 0; i < 5; i++) {
    try {
      const result = await measureQueryPerformance(
        connection,
        queryInfo.query,
        `${queryInfo.description} (第${i + 1}次)`,
      );
      times.push(result.executionTime);
      lastResult = result;
    } catch (error) {
      console.error(`查询失败: ${queryInfo.description} (第${i + 1}次)`);
      console.error(`错误信息: ${error}`);
      times.push(Number.POSITIVE_INFINITY);
    }
  }
  // 取中位数
  const sorted = times.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  performanceResults.push({
    description: queryInfo.description,
    executionTime: median,
    rowCount: lastResult ? lastResult.rowCount : 0,
  });
}

// 输出性能总结
console.log("\n=== 性能测试总结 ===");
console.log("查询类型\t\t执行时间(ms)\t结果数量");
console.log("-".repeat(60));

performanceResults.forEach((result) => {
  const description = result.description.padEnd(20);
  const time = (result.executionTime ?? 0).toFixed(2).padStart(10);
  const count = result.rowCount.toString().padStart(10);
  console.log(`${description}\t${time}\t${count}`);
});

// 计算平均执行时间
const avgTime =
  performanceResults.reduce((sum, result) => sum + (result.executionTime ?? 0), 0) /
  performanceResults.length;
console.log(`\n平均执行时间: ${avgTime.toFixed(2)}ms`);

// 找出最快和最慢的查询
const fastest = performanceResults.reduce((min, result) =>
  (result.executionTime ?? Infinity) < (min.executionTime ?? Infinity) ? result : min,
);
const slowest = performanceResults.reduce((max, result) =>
  (result.executionTime ?? -Infinity) > (max.executionTime ?? -Infinity) ? result : max,
);

console.log(`最快查询: ${fastest.description} (${(fastest.executionTime ?? 0).toFixed(2)}ms)`);
console.log(`最慢查询: ${slowest.description} (${(slowest.executionTime ?? 0).toFixed(2)}ms)`);
