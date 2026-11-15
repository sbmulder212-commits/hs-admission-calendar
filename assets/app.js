import { todayKst, eventsOn, upcoming, dday, ddayLabel, monthGrid, endOf } from "./lib.js";
import { CATEGORIES, catClass, el, detailHref, rangeText, loadEvents, showError, clearBoot } from "./ui.js";

const today = todayKst();
let [year, month] = today.split("-").map(Number);
let events = [];

const $ = (id) => document.getElementById(id);

function renderCalendar() {
  $("month-title").textContent = `${year}년 ${month}월`;
  const grid = $("grid");
  grid.replaceChildren();
  for (const week of monthGrid(year, month)) {
    for (const ymd of week) {
      if (!ymd) {
        grid.append(el("div", "cell empty"));
        continue;
      }
      const dayEvents = eventsOn(events, ymd);
      const cell = el(dayEvents.length ? "a" : "div", "cell");
      if (ymd === today) cell.classList.add("today");
      cell.append(el("span", "num", String(Number(ymd.slice(8)))));
      if (dayEvents.length) {
        cell.href = detailHref(ymd);
        cell.classList.add("has");
        cell.setAttribute("aria-label", `${ymd} 일정 ${dayEvents.length}건`);
        const dots = el("span", "dots");
        for (const category of new Set(dayEvents.map((e) => e.category))) {
          dots.append(el("i", `dot ${catClass(category)}`));
        }
        cell.append(dots, el("span", "cell-title", dayEvents[0].title));
        if (dayEvents.length > 1) cell.append(el("span", "more", `+${dayEvents.length - 1}`));
      }
      grid.append(cell);
    }
  }
}

function ddayText(event) {
  if (event.date > today) return ddayLabel(dday(event.date, today));
  if (!event.end) return "D-DAY";
  const left = dday(endOf(event), today);
  return left === 0 ? "오늘 마감" : `마감 D-${left}`;
}

function renderUpcoming() {
  const list = $("upcoming");
  list.replaceChildren();
  const items = upcoming(events, today);
  if (!items.length) {
    list.append(el("li", "notice", "남은 일정이 없습니다."));
    return;
  }
  for (const event of items) {
    const link = el("a", "item");
    link.href = detailHref(event.date < today ? today : event.date);
    link.append(el("span", `badge ${event.date <= today ? "now" : ""}`, ddayText(event)));
    const body = el("span", "item-body");
    body.append(el("strong", null, event.title));
    const meta = el("span", "meta");
    meta.append(el("i", `dot ${catClass(event.category)}`), el("span", null, `${event.category} · ${rangeText(event)}`));
    if (!event.verified) meta.append(el("span", "unverified", "미확인"));
    body.append(meta);
    link.append(body);
    const li = el("li");
    li.append(link);
    list.append(li);
  }
}

function move(delta) {
  month += delta;
  if (month < 1) [year, month] = [year - 1, 12];
  if (month > 12) [year, month] = [year + 1, 1];
  renderCalendar();
}

$("prev").addEventListener("click", () => move(-1));
$("next").addEventListener("click", () => move(1));
$("today-label").textContent = `오늘 ${today}`;
for (const category of CATEGORIES) {
  const item = el("li");
  item.append(el("i", `dot ${catClass(category)}`), el("span", null, category));
  $("legend").append(item);
}

try {
  events = await loadEvents();
  renderCalendar();
  renderUpcoming();
  clearBoot();
} catch {
  showError($("main"));
}
