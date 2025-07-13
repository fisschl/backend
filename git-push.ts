import { $ } from "bun";

const gitPush = async () => {
  try {
    await $`git push`;
  } catch {
    console.info("重试中...");
    setTimeout(gitPush, 1000);
  }
};

await gitPush();
