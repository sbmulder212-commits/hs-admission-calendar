import test from "node:test";
import assert from "node:assert/strict";
import {
  todayKst, isYmd, eventsOn, upcoming, dday, ddayLabel, monthGrid,
  addDays, thisWeek, nextWeek, nearestDeadline,
} from "./lib.js";

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

const evs = [
  { id: "a", date: "2026-12-03", end: "2026-12-07" },
  { id: "b", date: "2026-11-21" },
  { id: "c", date: "2026-11-12", end: "2026-11-20" },
  { id: "d", date: "2026-12-02" },
  { id: "e", date: "2026-11-02" },
];
const ids = (list) => list.map((e) => e.id);
const brief = (r) => r && { id: r.event.id, ymd: r.ymd, days: r.days, phase: r.phase };

test("addDays: 월·연도 경계", () => {
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("thisWeek: 진행 중과 7일 안 시작, 날짜순", () => {
  assert.deepEqual(ids(thisWeek(evs, "2026-11-16")), ["c", "b"]);
});

test("thisWeek: 7일째는 포함, 8일째와 끝난 일정은 제외", () => {
  assert.deepEqual(ids(thisWeek(evs, "2026-11-23")), []); // d는 9일 뒤, a는 10일 뒤
  assert.deepEqual(ids(thisWeek(evs, "2026-11-26")), ["d", "a"]); // a는 정확히 7일 뒤
});

test("thisWeek: 기간 일정의 한가운데 날", () => {
  assert.deepEqual(ids(thisWeek(evs, "2026-12-05")), ["a"]);
});

test("nextWeek: 8~14일째만", () => {
  assert.deepEqual(ids(nextWeek(evs, "2026-11-16")), []); // b는 5일째, d는 16일째
  assert.deepEqual(ids(nextWeek(evs, "2026-11-23")), ["d", "a"]); // 9일째, 10일째
});

test("nearestDeadline: 시작 전이면 시작일, 진행 중이면 끝나는 날", () => {
  assert.deepEqual(brief(nearestDeadline(evs, "2026-11-16", new Set())), { id: "c", ymd: "2026-11-20", days: 4, phase: "ends" });
  assert.deepEqual(brief(nearestDeadline(evs, "2026-11-21", new Set())), { id: "b", ymd: "2026-11-21", days: 0, phase: "ends" });
  assert.deepEqual(brief(nearestDeadline(evs, "2026-11-22", new Set())), { id: "d", ymd: "2026-12-02", days: 10, phase: "starts" });
});

test("nearestDeadline: 끝낸 것은 건너뛰고, 모두 끝내면 null, 모르는 id는 무시", () => {
  assert.equal(nearestDeadline(evs, "2026-11-16", new Set(["c"])).event.id, "b");
  assert.equal(nearestDeadline(evs, "2026-12-08", new Set(["gone"])), null);
  assert.equal(nearestDeadline([], "2026-11-16", new Set()), null);
});
