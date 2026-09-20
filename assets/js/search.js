import { searchItems } from "./content.js?v=20260920";
import { ui } from "./utils.js?v=20260920";
export const normalize = (value) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("id")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
export function search(query, type = "all") {
  const words = normalize(query.slice(0, 200)).split(" ").filter(Boolean);
  return searchItems.filter(
    (item) =>
      (type === "all" || item.type === type) &&
      words.every((word) =>
        normalize(
          [item.title, item.description, item.keywords].join(" "),
        ).includes(word),
      ),
  );
}
export function setupSearch() {
  const root = document.getElementById("pencarian"),
    input = ui(root, "searchInput"),
    form = input.closest("form");
  const rows = [...root.querySelectorAll("[data-result-id]")];
  let type = "all";
  function render() {
    const result = new Set(search(input.value, type).map((item) => item.id));
    rows.forEach((row) => {
      row.hidden = !result.has(row.dataset.resultId);
    });
    const count = rows.filter((row) => !row.hidden).length;
    ui(root, "resultsCountLabel").textContent = `${count} hasil ditemukan`;
    ui(root, "resultsCountLabel").setAttribute("role", "status");
    ui(root, "emptyState").hidden = count !== 0;
    ui(root, "clearBtn").disabled = !input.value;
    root.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === type;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active-filter", active);
    });
  }
  function updateURL(push = false) {
    const url = new URL(location.href),
      query = input.value.trim().slice(0, 200);
    query ? url.searchParams.set("q", query) : url.searchParams.delete("q");
    type === "all"
      ? url.searchParams.delete("type")
      : url.searchParams.set("type", type);
    if (url.href !== location.href)
      history[push ? "pushState" : "replaceState"]({}, "", url);
    render();
  }
  function restore() {
    const parameters = new URL(location.href).searchParams;
    input.value = (parameters.get("q") || "").slice(0, 200);
    type = ["all", "materi", "cerita", "alat"].includes(parameters.get("type"))
      ? parameters.get("type")
      : "all";
    render();
  }
  // Results update while typing; only deliberate searches create history entries.
  input.addEventListener("input", render);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    input.value = input.value.trim();
    updateURL(true);
  });
  root.querySelectorAll("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      type = button.dataset.filter;
      updateURL(true);
    }),
  );
  root.querySelectorAll(".quick-chip").forEach((button) =>
    button.addEventListener("click", () => {
      input.value = button.textContent.trim();
      type = "all";
      updateURL(true);
      input.focus({ preventScroll: true });
    }),
  );
  for (const id of ["clearBtn", "clearKeywordFromEmpty"])
    ui(root, id).addEventListener("click", () => {
      input.value = "";
      updateURL(true);
      input.focus({ preventScroll: true });
    });
  ui(root, "resetFilterBtn").addEventListener("click", () => {
    type = "all";
    updateURL(true);
  });
  ui(root, "resetFromEmpty").addEventListener("click", () => {
    input.value = "";
    type = "all";
    updateURL(true);
  });
  window.addEventListener("loka:navigate", restore);
  restore();
}
