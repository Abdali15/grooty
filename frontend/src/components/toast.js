import { esc } from "../lib/dom.js";

export function toast(message, { action, duration = 3200 } = {}) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button class="toast-action" type="button">${esc(action.label)}</button>` : ""}`;
  root.appendChild(el);
  while (root.children.length > 2) root.firstElementChild.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
  let t;
  const close = () => {
    clearTimeout(t);
    el.classList.remove("is-in");
    setTimeout(() => el.remove(), 260);
  };
  el.querySelector(".toast-action")?.addEventListener("click", () => {
    action.fn();
    close();
  });
  t = setTimeout(close, action ? Math.max(duration, 5000) : duration);
}
