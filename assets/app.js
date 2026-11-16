import {
  todayKst, eventsOn, upcoming, thisWeek, nextWeek, nearestDeadline, dday, ddayLabel, monthGrid, endOf,
} from "./lib.js";
import {
  CATEGORIES, catClass, el, detailHref, loadEvents, showError, clearBoot, loadDone, saveDone,
} from "./ui.js";

let today = todayKst();
let [year, month] = today.split("-").map(Number);
let events = [];
const done = loadDone();

const $ = (id) => document.getElementById(id);
const md = (ymd) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`;
const span = (e) => (e.end ? `${md(e.date)} ~ ${md(e.end)}` : md(e.date));

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

function renderTiles() {
  const next = nearestDeadline(events, today, done);
  const a = $("tile-next");
  a.replaceChildren(el("div", "k", "가장 가까운 일정"));
  if (next) {
    const big = next.phase === "ends" && next.days === 0 ? "오늘 마감" : ddayLabel(next.days);
    a.append(el("div", "n", big), el("div", "sub", `${next.phase === "ends" ? "마감" : "시작"} ${md(next.ymd)} · ${next.event.title}`));
  } else {
    a.append(el("div", "n", "없음"), el("div", "sub", "남은 마감 없음"));
  }
  const week = thisWeek(events, today);
  const b = $("tile-week");
  b.replaceChildren(
    el("div", "k", "이번 주"),
    el("div", "n", `${week.length}건`),
    el("div", "sub", `끝낸 것 ${week.filter((e) => done.has(e.id)).length}건`),
  );
}

function taskItem(event) {
  const li = el("li", done.has(event.id) ? "it done" : "it");
  const box = el("input");
  box.type = "checkbox";
  box.checked = done.has(event.id);
  box.setAttribute("aria-label", `${event.title} 끝냄`);
  box.addEventListener("change", () => {
    if (box.checked) done.add(event.id);
    else done.delete(event.id);
    li.classList.toggle("done", box.checked);
    saveDone(done);
    renderTiles();
  });
  const wrap = el("label", "ck");
  wrap.append(box);

  const body = el("div", "it-body");
  const link = el("a", "it-title", event.title);
  link.href = detailHref(event.date < today ? today : event.date);
  const meta = el("div", "meta");
  meta.append(
    el("strong", "d", span(event)),
    el("i", `dot ${catClass(event.category)}`),
    el("span", null, event.category),
    el("span", `tag ${event.verified ? "ok" : "warn"}`, event.verified ? "공식" : "미확인"),
    el("span", "when", ddayText(event)),
  );
  body.append(link, meta);
  li.append(wrap, body);
  return li;
}

function fillList(id, items, emptyText) {
  const list = $(id);
  list.replaceChildren();
  if (!items.length) list.append(el("li", "notice", emptyText));
  for (const event of items) list.append(taskItem(event));
}

function renderLists() {
  fillList("list-week", thisWeek(events, today), "이번 주에는 없습니다.");
  fillList("list-next", nextWeek(events, today), "다음 주에도 없습니다.");
  fillList("upcoming", upcoming(events, today), "남은 일정이 없습니다.");
}

function renderAll() {
  $("today-label").textContent = `오늘 ${today}`;
  renderTiles();
  renderLists();
  renderCalendar();
}

const VIEWS = ["home", "calendar", "all"];
function showView() {
  const wanted = location.hash.slice(1);
  const view = VIEWS.includes(wanted) ? wanted : "home";
  document.body.dataset.view = view;
  for (const a of $("tabs").querySelectorAll("a")) {
    if (a.getAttribute("href") === `#${view}`) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
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
$("tabs").addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;
  e.preventDefault();
  history.pushState(null, "", a.getAttribute("href"));
  showView();
  window.scrollTo(0, 0);
});
addEventListener("hashchange", showView);
addEventListener("popstate", showView);
showView();

for (const category of CATEGORIES) {
  const item = el("li");
  item.append(el("i", `dot ${catClass(category)}`), el("span", null, category));
  $("legend").append(item);
}

// 자정을 넘겨 열려 있던 화면을 다시 볼 때 날짜를 갱신한다.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && events.length && todayKst() !== today) {
    today = todayKst();
    [year, month] = today.split("-").map(Number);
    renderAll();
  }
});

try {
  events = await loadEvents();
  renderAll();
  clearBoot();
} catch {
  showError($("main"));
}
