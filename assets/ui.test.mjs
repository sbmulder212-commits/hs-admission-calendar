import test from "node:test";
import assert from "node:assert/strict";
import { loadDone, saveDone } from "./ui.js";

const fake = (initial = {}) => ({
  data: { ...initial },
  getItem(k) { return k in this.data ? this.data[k] : null; },
  setItem(k, v) { this.data[k] = v; },
});
const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };

test("saveDone 후 loadDone으로 같은 집합", () => {
  const s = fake();
  assert.equal(saveDone(new Set(["a", "b"]), s), true);
  assert.deepEqual([...loadDone(s)].sort(), ["a", "b"]);
});

test("값이 없으면 빈 집합", () => assert.equal(loadDone(fake()).size, 0));

test("깨진 JSON이나 배열이 아닌 값은 빈 집합", () => {
  assert.equal(loadDone(fake({ "goip.done.v1": "{oops" })).size, 0);
  assert.equal(loadDone(fake({ "goip.done.v1": '{"a":1}' })).size, 0);
});

test("문자열이 아닌 항목은 버린다", () => {
  assert.deepEqual([...loadDone(fake({ "goip.done.v1": '["a", 1, null, "b"]' }))].sort(), ["a", "b"]);
});

test("저장소가 막혀 있으면 예외 없이 빈 집합과 false", () => {
  assert.equal(loadDone(broken).size, 0);
  assert.equal(saveDone(new Set(["a"]), broken), false);
});
