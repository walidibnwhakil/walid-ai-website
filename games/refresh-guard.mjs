// Prevent accidental pull-to-refresh only while an in-progress game is active.
// Browser-toolbar reload cannot be disabled; beforeunload requests its native warning.
let active = false;
let origin = null;
const root = document.documentElement;
const style = document.createElement("style");
style.id = "game-refresh-protection";
style.textContent =
  "html.game-in-progress,html.game-in-progress body{overscroll-behavior-y:none}";
document.head.append(style);
function warnBeforeLeaving(event) {
  event.preventDefault();
  event.returnValue = "";
}
function blockRefreshShortcut(event) {
  if (
    event.key === "F5" ||
    (!event.altKey &&
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "r")
  ) {
    event.preventDefault();
  }
}
function beginTouch(event) {
  origin =
    event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
}
function canScrollUp(target) {
  for (
    let node = target instanceof Element ? target : target?.parentElement;
    node;
    node = node.parentElement
  ) {
    const overflow = getComputedStyle(node).overflowY;
    if (
      node.scrollTop > 0 &&
      (node === document.scrollingElement ||
        /auto|scroll|overlay/.test(overflow))
    )
      return true;
  }
  return document.scrollingElement.scrollTop > 0;
}
function preventTopPull(event) {
  if (!origin || event.touches.length !== 1 || !event.cancelable) return;
  const dx = event.touches[0].clientX - origin.x,
    dy = event.touches[0].clientY - origin.y;
  if (dy > 0 && dy > Math.abs(dx) && !canScrollUp(event.target))
    event.preventDefault();
}
function endTouch() {
  origin = null;
}
export function setGameInProgress(value) {
  value = Boolean(value);
  if (value === active) return;
  active = value;
  root.classList.toggle("game-in-progress", active);
  origin = null;
  if (active) {
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("keydown", blockRefreshShortcut, true);
    document.addEventListener("touchstart", beginTouch, { passive: true });
    document.addEventListener("touchmove", preventTopPull, { passive: false });
    document.addEventListener("touchend", endTouch, { passive: true });
    document.addEventListener("touchcancel", endTouch, { passive: true });
  } else {
    window.removeEventListener("beforeunload", warnBeforeLeaving);
    document.removeEventListener("keydown", blockRefreshShortcut, true);
    document.removeEventListener("touchstart", beginTouch);
    document.removeEventListener("touchmove", preventTopPull);
    document.removeEventListener("touchend", endTouch);
    document.removeEventListener("touchcancel", endTouch);
  }
}
