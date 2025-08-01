import fs from "node:fs/promises";
import path from "node:path";

const distDir = "./dist";
await fs.mkdir(distDir, { recursive: true });
for (const file of await fs.readdir(distDir)) {
  const filePath = path.join(distDir, file);
  const fileStat = await fs.stat(filePath);
  if (fileStat.isDirectory()) await fs.rm(filePath, { recursive: true, force: true });
  else await fs.unlink(filePath);
}

await Bun.build({
  entrypoints: ["./index.ts"],
  outdir: distDir,
  splitting: true,
  minify: true,
  target: "bun",
  format: "esm",
});
