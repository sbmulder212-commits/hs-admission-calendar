import {
  todayKst, eventsOn, upcoming, thisWeek, nextWeek, nearestDeadline, dday, ddayLabel, monthGrid, endOf,
  kindOf, dayState, filterByTracks,
} from "./lib.js";
import {
  catClass, el, detailHref, loadEvents, showError, clearBoot, loadDone, saveDone, TRACKS, loadTracks, saveTracks,
} from "./ui.js";

let today = todayKst();
let [year, month] = today.split("-").map(Number);
let allEvents = [];
let events = [];
const done = loadDone();
const tracks = loadTracks();

const $ = (id) => document.getElementById(id);
const md = (ymd) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}`;
const span = (e) => (e.end ? `${md(e.date)} ~ ${md(e.end)}` : md(e.date));

// 달력 칸의 상태. 중요한 순서로 나열한다.
const KIND_NAME = { deadline: "접수 마감", result: "발표", register: "등록", interview: "면접", apply: "접수 기간", info: "설명회", other: "기타" };
const KIND_SHORT = { deadline: "마감", result: "발표", register: "등록", interview: "면접", apply: "접수", info: "설명", other: "" };

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
      const state = dayState(events, ymd);
      const cell = el(state ? "a" : "div", "cell");
      if (ymd === today) cell.classList.add("today");
      cell.append(el("span", "num", String(Number(ymd.slice(8)))));
      if (state) {
        cell.href = detailHref(ymd);
        cell.classList.add("has", `st-${state}`);
        // 색만으로 구분하지 않도록 글자를 함께 쓴다.
        cell.setAttribute("aria-label", `${ymd} ${KIND_NAME[state]} 포함 일정 ${dayEvents.length}건`);
        cell.append(el("span", "kind", KIND_SHORT[state]), el("span", "cell-title", dayEvents[0].title));
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
  li.dataset.id = event.id;
  li.dataset.kind = kindOf(event);
  const box = el("input");
  box.type = "checkbox";
  box.checked = done.has(event.id);
  box.setAttribute("aria-label", `${event.title} 끝냄`);
  box.addEventListener("change", () => {
    if (box.checked) done.add(event.id);
    else done.delete(event.id);
    // 같은 일정이 다른 목록에도 있으므로 모든 행을 맞춘다. 다시 그리면 키보드 포커스를 잃는다.
    for (const row of document.querySelectorAll(".it")) {
      if (row.dataset.id !== event.id) continue;
      row.classList.toggle("done", box.checked);
      row.querySelector("input").checked = box.checked;
    }
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

// 일반고는 후기 동시 지원이라 항상 켜 둔다. 켜짐은 색 대신 체크 글자로도 알린다.
function renderFilter() {
  const bar = $("filter");
  bar.replaceChildren();
  const fixed = el("button", "chip on", "✓ 일반고 (항상)");
  fixed.type = "button";
  fixed.setAttribute("aria-pressed", "true");
  fixed.setAttribute("aria-disabled", "true");
  bar.append(fixed);
  for (const track of TRACKS) {
    const on = tracks.has(track);
    const chip = el("button", on ? "chip on" : "chip");
    chip.type = "button";
    chip.dataset.track = track;
    chip.setAttribute("aria-pressed", String(on));
    chip.append(el("i", `dot ${catClass(track)}`), el("span", null, `${on ? "✓ " : ""}${track}`));
    chip.addEventListener("click", () => {
      if (on) tracks.delete(track);
      else tracks.add(track);
      saveTracks(tracks);
      renderFilter();
      // 다시 그리면 포커스를 잃으므로 같은 버튼으로 돌려놓는다.
      [...$("filter").children].find((c) => c.dataset.track === track).focus();
      applyFilter();
    });
    bar.append(chip);
  }
}

function applyFilter() {
  events = filterByTracks(allEvents, tracks);
  renderAll();
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

for (const state of ["deadline", "result", "register", "interview", "apply", "info"]) {
  const item = el("li");
  item.append(el("i", `swatch st-${state}`), el("span", null, KIND_NAME[state]));
  $("legend").append(item);
}

// 자정을 넘겨 열려 있던 화면을 다시 볼 때 날짜를 갱신한다.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && allEvents.length && todayKst() !== today) {
    today = todayKst();
    [year, month] = today.split("-").map(Number);
    renderAll();
  }
});

try {
  allEvents = await loadEvents();
  renderFilter();
  applyFilter();
  clearBoot();
} catch {
  showError($("main"));
}
