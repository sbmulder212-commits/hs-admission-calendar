import { isYmd, eventsOn, filterByTracks } from "./lib.js";
import { catClass, el, rangeText, loadEvents, showError, clearBoot, loadTracks } from "./ui.js";

const main = document.getElementById("main");
const ymd = new URLSearchParams(location.search).get("date");

function listSection(title, items) {
  if (!items?.length) return null;
  const section = el("section");
  section.append(el("h3", null, title));
  const list = el("ul");
  for (const item of items) list.append(el("li", null, item));
  section.append(list);
  return section;
}

function externalLink(name, url) {
  // https:// 주소만 링크로 만든다.
  if (typeof url !== "string" || !url.startsWith("https://")) return el("span", null, name);
  const link = el("a", null, name);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function linkSection(title, links) {
  if (!links?.length) return null;
  const section = el("section");
  section.append(el("h3", null, title));
  const list = el("ul", "links");
  for (const { name, url } of links) {
    const li = el("li");
    li.append(externalLink(name, url));
    list.append(li);
  }
  section.append(list);
  return section;
}

function card(event) {
  const article = el("article", `card ${catClass(event.category)}`);
  const head = el("p", "meta");
  head.append(el("i", `dot ${catClass(event.category)}`), el("span", null, `${event.category} · ${rangeText(event)}`));
  if (!event.verified) head.append(el("span", "unverified", "미확인 — 공식 요강으로 확인 필요"));
  article.append(head, el("h2", null, event.title), el("p", "summary", event.summary));
  const sections = [
    listSection("요강", event.requirements),
    listSection("주의할 점", event.cautions),
    linkSection("요강·학교 링크", event.schools),
    linkSection("출처", event.source ? [event.source] : []),
  ];
  article.append(...sections.filter(Boolean));
  return article;
}

try {
  const events = eventsOn(filterByTracks(await loadEvents(), loadTracks()), ymd);
  if (isYmd(ymd)) {
    document.getElementById("date-title").textContent = ymd;
    document.title = `${ymd} · 고입 일정`;
  }
  if (events.length) main.replaceChildren(...events.map(card));
  else main.replaceChildren(el("p", "notice", "이 날짜에는 일정이 없습니다."));
  clearBoot();
} catch {
  showError(main);
}
