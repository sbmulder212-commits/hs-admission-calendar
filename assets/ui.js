// 두 화면이 함께 쓰는 DOM 도우미. 데이터 문자열은 항상 textContent로 넣는다.

export const CATEGORIES = ["일반고", "자사고", "외고·국제고", "과학고·영재학교", "특성화고·마이스터고"];

// 일반고는 항상 보이므로 고를 수 있는 전형에서 뺀다.
export const TRACKS = CATEGORIES.filter((c) => c !== "일반고");

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

// 체크 표시는 이 기기 브라우저에만 저장한다. 저장소를 못 쓰면 그 세션에서만 유지된다.
const DONE_KEY = "goip.done.v1";

export function loadDone(storage) {
  try {
    const list = JSON.parse((storage ?? globalThis.localStorage).getItem(DONE_KEY));
    return new Set(Array.isArray(list) ? list.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveDone(done, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(DONE_KEY, JSON.stringify([...done]));
    return true;
  } catch {
    return false;
  }
}

// 고른 전형도 이 기기에만 저장한다. 값이 없거나 깨지면 전부 켠다.
const TRACKS_KEY = "goip.tracks.v1";

export function loadTracks(storage) {
  try {
    const list = JSON.parse((storage ?? globalThis.localStorage).getItem(TRACKS_KEY));
    return new Set(Array.isArray(list) ? list.filter((t) => TRACKS.includes(t)) : TRACKS);
  } catch {
    return new Set(TRACKS);
  }
}

export function saveTracks(tracks, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(TRACKS_KEY, JSON.stringify([...tracks]));
    return true;
  } catch {
    return false;
  }
}

// 스크립트가 실행되면 HTML에 미리 적어 둔 안내 문구를 지운다.
export const clearBoot = () => document.getElementById("boot")?.remove();

export function showError(container) {
  clearBoot();
  container.replaceChildren(
    el("p", "notice", "일정 데이터를 불러오지 못했습니다. 주소를 통해 열었는지 확인해 주세요.")
  );
}