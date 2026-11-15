// 두 화면이 함께 쓰는 DOM 도우미. 데이터 문자열은 항상 textContent로 넣는다.

export const CATEGORIES = ["일반고", "자사고", "외고·국제고", "과학고·영재학교", "특성화고·마이스터고"];

export const catClass = (category) => `cat-${Math.max(0, CATEGORIES.indexOf(category))}`;

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export const detailHref = (ymd) => `./detail.html?date=${ymd}`;

export const rangeText = (event) => (event.end ? `${event.date} ~ ${event.end}` : event.date);

export async function loadEvents() {
  const response = await fetch("./data/events.json", { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function showError(container) {
  container.replaceChildren(
    el("p", "notice", "일정 데이터를 불러오지 못했습니다. 주소를 통해 열었는지 확인해 주세요.")
  );
}

export function registerSw() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}
