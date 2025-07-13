import { $ } from "bun";
import consola from "consola";

const gitPush = async () => {
  try {
    await $`git push`;
  } catch {
    consola.info("重试中...");
    setTimeout(gitPush, 1000);
  }
};

await gitPush();
