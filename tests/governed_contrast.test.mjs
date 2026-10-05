import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { paletteContrast } from "../src/lib/intelligence/orchestration/contrastMath.ts";

test("WCAG black/white contrast is 21 in either direction", () => {
  assert.equal(paletteContrast("#000000", "#ffffff"), 21);
  assert.equal(paletteContrast("#ffffff", "#000000"), 21);
});
test("cream text on white from unreadable hero is rejected", () => {
  assert.ok(paletteContrast("#fff9eb", "#ffffff") < 3);
});
test("invalid tokens cannot pass palette validation", () => {
  for (const token of ["transparent", "#fff", "#zzzzzz", "var(--text)"]) assert.equal(paletteContrast(token, "#ffffff"), 0);
});
test("donut render offsets remain deterministic across repeated renders", () => {
  const require = createRequire(import.meta.url);
  const source = fs.readFileSync(new URL("../src/components/charts/SvgCharts.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: id => {
    if (id === "framer-motion") return { useReducedMotion: () => false, motion: {
      circle: ({ initial: _initial, animate: _animate, transition: _transition, ...props }) => React.createElement("circle", props),
    } };
    assert.ok(["react", "react/jsx-runtime"].includes(id)); return require(id);
  } });
  const data = [{ label: "First", value: 25 }, { label: "Second", value: 75 }];
  const render = () => renderToStaticMarkup(React.createElement(loaded.exports.DonutChart, { data }));
  const first = render(); assert.equal(render(), first);
  const offsets = [...first.matchAll(/stroke-dashoffset="([^"]+)"/g)].map(match => Number(match[1]));
  assert.equal(offsets.length, 2); assert.equal(offsets[0], 0);
  assert.ok(Math.abs(offsets[1] + .25 * 2 * Math.PI * 60) < 1e-9);
});
