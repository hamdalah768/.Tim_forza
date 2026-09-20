// Progressive enhancement: content is readable before scripts run and after an animation is cancelled.
export function setupMotion() {
  const main = document.querySelector("main");
  if (
    !main ||
    !("IntersectionObserver" in window) ||
    !Element.prototype.animate
  )
    return;
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 767px)");
  const seen = new WeakSet();
  const pending = new Set();
  const active = new Map();
  const selector = [
    ".story-card",
    ".search-result",
    ".source-card",
    "[data-module-card]",
    "[data-tilt]",
    ".loka-field",
    "[data-account-form]",
    ".account-tabs",
    ".provider-options",
    ".module-switcher",
    "[data-lesson-stages] > a",
    "#materi--quiz-panel",
    "fieldset",
    "details",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "ul",
    "ol",
    'img[alt]:not([alt=""])',
    "a.loka-btn",
    "button.loka-btn",
    "a.inline-flex",
  ].join(",");
  function finish(node) {
    active.get(node)?.cancel();
    active.delete(node);
    node.removeAttribute("data-revealing");
  }
  function cancelAll() {
    for (const node of active.keys()) finish(node);
  }
  function reveal(node, index) {
    if (seen.has(node) || !node.isConnected || node.closest("[hidden]")) return;
    seen.add(node);
    pending.delete(node);
    observer.unobserve(node);
    if (
      preference.matches ||
      document.hidden ||
      node.contains(document.activeElement)
    )
      return;
    const opacity = getComputedStyle(node).opacity;
    if (opacity === "0") return;
    const photo = node.matches(
      "img,[data-tilt],.story-card,[data-module-card]",
    );
    const distance = compact.matches ? 16 : photo ? 30 : 22;
    const start = { opacity: 0 };
    const end = { opacity: opacity || 1 };
    // Individual transforms leave existing card rotations and pointer tilt intact.
    if (window.CSS?.supports?.("translate", "0 1px")) {
      start.translate = `0 ${distance}px`;
      end.translate = "0 0";
      if (photo) {
        start.scale = "0.985";
        end.scale = "1";
      }
    }
    node.setAttribute("data-revealing", "");
    const animation = node.animate([start, end], {
      duration: compact.matches ? 800 : photo ? 1200 : 1000,
      delay: Math.min(index, 3) * (compact.matches ? 55 : 85),
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "backwards",
    });
    active.set(node, animation);
    animation.finished.then(
      () => {
        if (active.get(node) === animation) {
          active.delete(node);
          node.removeAttribute("data-revealing");
        }
      },
      () => {
        /* Cancelling an entry animation restores the normal, visible styles. */
      },
    );
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        )
        .forEach((entry, index) => reveal(entry.target, index));
    },
    { threshold: 0, rootMargin: "0px 0px -32px 0px" },
  );
  function register(scope) {
    const nodes = [
      ...(scope.matches?.(selector) ? [scope] : []),
      ...scope.querySelectorAll(selector),
    ];
    for (const node of nodes) {
      if (
        seen.has(node) ||
        pending.has(node) ||
        node.closest(
          'dialog,[aria-live],[role="status"],[aria-hidden="true"],.absolute,.pointer-events-none',
        )
      )
        continue;
      if (node.parentElement?.closest("[data-reveal]")) continue;
      node.setAttribute("data-reveal", "");
      pending.add(node);
      observer.observe(node);
    }
  }
  register(main);
  const additions = new MutationObserver((records) => {
    for (const node of pending)
      if (!node.isConnected) {
        observer.unobserve(node);
        pending.delete(node);
      }
    for (const node of active.keys()) if (!node.isConnected) finish(node);
    for (const record of records)
      for (const node of record.addedNodes)
        if (node.nodeType === 1) register(node);
  });
  additions.observe(main, { childList: true, subtree: true });
  document.addEventListener("focusin", (event) => {
    for (const node of active.keys())
      if (node.contains(event.target)) finish(node);
  });
  preference.addEventListener("change", () => {
    if (preference.matches) cancelAll();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAll();
  });
  window.addEventListener("pagehide", cancelAll);
}
