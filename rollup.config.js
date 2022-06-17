import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript";
import pkg from "./package.json";

export default [
  {
    input: "index.ts",
    plugins: [resolve(), commonjs(), typescript()],
    output: {
      name: pkg.name,
      file: `${pkg.name}.js`,
      format: "umd",
    },
  },
  {
    input: "index.ts",
    plugins: [typescript()],
    output: [{ file: pkg.main, format: "es" }],
  },
];
