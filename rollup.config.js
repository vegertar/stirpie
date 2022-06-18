import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

export default [
  {
    input: "index.ts",
    plugins: [resolve(), commonjs(), typescript()],
    output: {
      name: pkg.name,
      file: pkg.main,
      format: "umd",
    },
  },
  {
    input: "index.ts",
    plugins: [resolve(), commonjs(), typescript(), terser()],
    output: {
      name: pkg.name,
      file: pkg.browser,
      indent: false,
      format: "umd",
    },
  },
  {
    input: "index.ts",
    plugins: [typescript()],
    output: [{ file: pkg.module, format: "es" }],
  },
];
