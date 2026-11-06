export function gameShell({reset, modes = true}) {
  const board = document.querySelector("#board");
  const status = document.querySelector("#status");
  const mode = document.querySelector("#mode");
  let timer;
  const restart = () => {
    clearTimeout(timer);
    reset();
  };
  document.querySelector("#restart").addEventListener("click", restart);
  mode.addEventListener("change", restart);
  mode.closest("label").hidden = !modes;
  return {
    board,
    status,
    restart,
    get bot() { return modes && mode.value === "bot"; },
    later(action, delay = 360) {
      clearTimeout(timer);
      timer = setTimeout(action, delay);
    },
  };
}

export function control(text, action, label = text) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", action);
  return button;
}

export function choose(items, random = Math.random) {
  return items[Math.floor(random() * items.length)];
}
