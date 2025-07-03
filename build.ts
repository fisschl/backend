import { build } from "obuild";

await build({
  entries: [
    {
      input: "./src/index.ts",
      type: "bundle",
      dts: false,
      minify: false,
    },
  ],
});
