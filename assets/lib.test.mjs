import test from "node:test";
import assert from "node:assert/strict";
import {
  todayKst, isYmd, eventsOn, upcoming, dday, ddayLabel, monthGrid,
  addDays, thisWeek, nextWeek, nearestDeadline, kindOf, dayState, filterByTracks,
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

test("kindOf: 제목으로 일정 종류를 나눈다", () => {
  const k = (title) => kindOf({ title });
  assert.equal(k("입학설명회: 북일고, 선덕고"), "info");
  assert.equal(k("서울 특성화고 추가모집 원서 접수 (합격자 발표 12월 3일)"), "apply"); // 괄호 안은 무시
  assert.equal(k("서울 광역 자사고 추첨, 면접 대상자 발표"), "result");
  assert.equal(k("하나고 1단계 합격자(면접 대상자) 발표"), "result");
  assert.equal(k("서울 후기 일반고 배정 학교 발표"), "result");
  assert.equal(k("서울 후기 일반고 입학 등록"), "register");
  assert.equal(k("하나고 면접 및 체력검사"), "interview");
  assert.equal(k("서울 후기 일반고 입학 전 배정 인터넷 접수"), "apply");
  assert.equal(k("알 수 없는 일정"), "other");
});

test("dayState: 접수 마감일이 가장 강하고, 같은 날이면 더 중요한 것이 이긴다", () => {
  const apply = { id: "a", title: "후기 일반고 원서 접수", date: "2026-12-03", end: "2026-12-07" };
  const result = { id: "r", title: "합격자 발표", date: "2026-12-05" };
  const info = { id: "i", title: "입학설명회", date: "2026-12-04" };
  const one = { id: "o", title: "외고 원서 접수", date: "2026-12-10" };
  const list = [apply, result, info, one];
  assert.equal(dayState(list, "2026-12-03"), "apply"); // 시작일은 아직 마감이 아니다
  assert.equal(dayState(list, "2026-12-04"), "apply"); // 접수 > 설명회
  assert.equal(dayState(list, "2026-12-05"), "result"); // 발표 > 접수
  assert.equal(dayState(list, "2026-12-07"), "deadline"); // 접수 마지막 날
  assert.equal(dayState(list, "2026-12-10"), "deadline"); // 하루짜리 접수는 그날이 마감
  assert.equal(dayState(list, "2026-12-08"), null);
  assert.equal(dayState([{ id: "d", title: "원서 접수", date: "2026-12-07" }, { id: "e", title: "합격자 발표", date: "2026-12-07" }], "2026-12-07"), "deadline");
});

const cat = (id, category) => ({ id, category, date: "2026-12-01" });
const mixed = [cat("g", "일반고"), cat("a", "자사고"), cat("t", "특성화고·마이스터고")];

test("filterByTracks: 일반고는 항상 남고 고른 전형만 남는다", () => {
  assert.deepEqual(filterByTracks(mixed, new Set(["자사고"])).map((e) => e.id), ["g", "a"]);
});

test("filterByTracks: 모두 끄면 일반고만", () => {
  assert.deepEqual(filterByTracks(mixed, new Set()).map((e) => e.id), ["g"]);
});
