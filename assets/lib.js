// 날짜는 모두 "YYYY-MM-DD" 문자열(한국 시간)로 다룬다.
// new Date("YYYY-MM-DD")는 UTC로 해석되어 하루가 밀릴 수 있으므로 쓰지 않는다.

const pad = (n) => String(n).padStart(2, "0");
const toYmd = (utcMs) => {
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const toUtc = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const DAY = 86400000;

export function todayKst(now = new Date()) {
  return toYmd(now.getTime() + 9 * 3600000);
}

export function isYmd(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toYmd(toUtc(s)) === s;
}

export const endOf = (event) => event.end ?? event.date;

export function eventsOn(events, ymd) {
  if (!isYmd(ymd)) return [];
  return events.filter((e) => e.date <= ymd && ymd <= endOf(e));
}

export function upcoming(events, today) {
  return events.filter((e) => endOf(e) >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export const addDays = (ymd, n) => toYmd(toUtc(ymd) + n * DAY);

const byDate = (a, b) => a.date.localeCompare(b.date);

// 오늘 걸치거나 7일 안에 시작하는 일정
export function thisWeek(events, today) {
  const last = addDays(today, 7);
  return events.filter((e) => e.date <= last && endOf(e) >= today).sort(byDate);
}

// 8~14일 안에 시작하는 일정
export function nextWeek(events, today) {
  const from = addDays(today, 7);
  const last = addDays(today, 14);
  return events.filter((e) => e.date > from && e.date <= last).sort(byDate);
}

// 끝내지 않은 일정 중 다음에 신경 쓸 날(시작 전이면 시작일, 진행 중이면 끝나는 날)이 가장 이른 것
export function nearestDeadline(events, today, doneIds) {
  let best = null;
  for (const event of events) {
    if (doneIds.has(event.id) || endOf(event) < today) continue;
    const starts = event.date > today;
    const ymd = starts ? event.date : endOf(event);
    if (!best || ymd < best.ymd || (ymd === best.ymd && event.date < best.event.date)) {
      best = { event, ymd, phase: starts ? "starts" : "ends" };
    }
  }
  return best && { ...best, days: dday(best.ymd, today) };
}

export function dday(ymd, today) {
  return Math.round((toUtc(ymd) - toUtc(today)) / DAY);
}

export function ddayLabel(n) {
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

// month: 1~12. 일요일 시작 주 단위 배열, 달 밖 칸은 null.
export function monthGrid(year, month) {
  const first = Date.UTC(year, month - 1, 1);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array(new Date(first).getUTCDay()).fill(null);
  for (let d = 0; d < days; d++) cells.push(toYmd(first + d * DAY));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
