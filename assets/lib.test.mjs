import test from "node:test";
import assert from "node:assert/strict";
import { todayKst, isYmd, eventsOn, upcoming, dday, ddayLabel, monthGrid } from "./lib.js";

const single = { id: "s", date: "2026-12-05" };
const range = { id: "r", date: "2026-12-01", end: "2026-12-10" };
const past = { id: "p", date: "2026-11-20" };

test("todayKst: 15:30 UTC는 한국 다음 날", () => {
  assert.equal(todayKst(new Date("2026-12-02T15:30:00Z")), "2026-12-03");
});

test("isYmd", () => {
  assert.equal(isYmd("2026-12-03"), true);
  assert.equal(isYmd("2026-02-30"), false);
  assert.equal(isYmd("2026-1-3"), false);
  assert.equal(isYmd(""), false);
  assert.equal(isYmd(null), false);
});

test("eventsOn: 단일 일정은 당일만", () => {
  assert.deepEqual(eventsOn([single], "2026-12-05"), [single]);
  assert.deepEqual(eventsOn([single], "2026-12-06"), []);
});

test("eventsOn: 기간 한가운데", () => {
  assert.deepEqual(eventsOn([range], "2026-12-05"), [range]);
  assert.deepEqual(eventsOn([range], "2026-12-10"), [range]);
  assert.deepEqual(eventsOn([range], "2026-12-11"), []);
});

test("eventsOn: 잘못된 날짜는 빈 배열", () => {
  assert.deepEqual(eventsOn([single, range], "abc"), []);
  assert.deepEqual(eventsOn([single, range], null), []);
});

test("upcoming: 진행 중 포함, 지난 일정 제외, 날짜순", () => {
  const result = upcoming([single, past, range], "2026-12-03");
  assert.deepEqual(result.map((e) => e.id), ["r", "s"]);
});

test("dday: 월·연도 경계", () => {
  assert.equal(dday("2027-01-02", "2026-12-30"), 3);
  assert.equal(dday("2026-12-01", "2026-12-03"), -2);
  assert.equal(dday("2026-12-03", "2026-12-03"), 0);
});

test("ddayLabel", () => {
  assert.equal(ddayLabel(0), "D-DAY");
  assert.equal(ddayLabel(3), "D-3");
  assert.equal(ddayLabel(-2), "D+2");
});

test("monthGrid: 2026년 12월", () => {
  const g = monthGrid(2026, 12);
  assert.deepEqual(g[0], [null, null, "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"]);
  assert.equal(g.at(-1)[4], "2026-12-31");
  assert.ok(g.every((w) => w.length === 7));
});
