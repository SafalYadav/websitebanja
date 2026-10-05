import assert from "node:assert/strict";
import test from "node:test";
import { measureRenderedText } from "../src/lib/intelligence/orchestration/renderedTextContrast.ts";

const image = pixels => ({ data: Buffer.from(pixels.flat()), width: pixels.length, height: 1, channels: 3 });
const fill = rgb => image(Array.from({ length: 4 }, () => rgb));
const target = [{ id: "heading", label: "Business heading", requiredRatio: 3, rectangles: [{ left: 0, top: 0, right: 4, bottom: 1 }] }];
function frames(actual, background) {
  return { actual, hidden: background, hiddenAgain: background, black: fill([0, 0, 0]), white: fill([255, 255, 255]) };
}
test("raster glyph/background ratio rejects cream on white and samples the worst gradient region", () => {
  const cream = measureRenderedText(target, frames(fill([255, 247, 231]), fill([255, 255, 255])))[0];
  assert.equal(cream.passed, false);
  assert.ok(cream.minimumRatio < 1.2);
  const gradient = measureRenderedText(target, frames(fill([255, 255, 255]), image([[0, 0, 0], [30, 30, 30], [80, 80, 80], [255, 255, 255]])))[0];
  assert.equal(gradient.passed, false);
  assert.equal(gradient.minimumRatio, 1);
  assert.equal(measureRenderedText(target, frames(fill([255, 255, 255]), fill([0, 0, 0])))[0].passed, true);
});
test("unstable backgrounds, absent glyphs and mismatched screenshots cannot report measured success", () => {
  const good = frames(fill([255, 255, 255]), fill([0, 0, 0]));
  const unstable = measureRenderedText(target, { ...good, hiddenAgain: fill([30, 30, 30]) })[0];
  assert.equal(unstable.passed, false);
  assert.match(unstable.error, /Background changed/);
  const invisible = measureRenderedText(target, { ...good, white: good.black })[0];
  assert.equal(invisible.passed, false);
  assert.equal(invisible.minimumRatio, null);
  assert.throws(() => measureRenderedText(target, { ...good, white: { ...good.white, width: 3 } }), /dimensions changed/);
});
