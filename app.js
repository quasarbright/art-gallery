// Vector art gallery: reads art.json, renders a grid grouped by year, and a
// full-screen viewer at #<piece-id>.

const gallery = document.getElementById("gallery");
const viewer = document.getElementById("viewer");
const vImg = viewer.querySelector(".viewer-img");
const vTitle = viewer.querySelector(".viewer-title");
const vMeta = viewer.querySelector(".viewer-meta");
const vLinks = viewer.querySelector(".viewer-links");

let pieces = [];
let current = -1;
let lastFocus = null;

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtDate = (d) => (d ? dateFmt.format(new Date(d + "T00:00:00Z")) : "");

// ---------- grid ----------
function renderGrid() {
  const byYear = new Map();
  for (const p of pieces) {
    const y = p.date ? p.date.slice(0, 4) : "Undated";
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(p);
  }
  gallery.innerHTML = "";
  for (const [year, list] of byYear) {
    const sec = document.createElement("section");
    sec.className = "gal-year";
    sec.setAttribute("aria-label", year);
    const h = document.createElement("h2");
    h.className = "gal-year-label";
    h.innerHTML = `${year}<span class="gal-year-count">${list.length} ${list.length === 1 ? "piece" : "pieces"}</span>`;
    const ul = document.createElement("ul");
    ul.className = "gal-grid";
    for (const p of list) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gal-tile";
      btn.dataset.id = p.id;
      btn.title = `View ${p.title} large`;
      const frame = document.createElement("span");
      frame.className = "gal-tile-frame";
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = p.title;
      img.src = p.thumb;
      frame.append(img);
      btn.append(frame);
      btn.insertAdjacentHTML("beforeend",
        `<span class="gal-tile-title"></span><span class="gal-tile-date">${fmtDate(p.date)}</span>`);
      btn.querySelector(".gal-tile-title").textContent = p.title;
      btn.addEventListener("click", () => { location.hash = p.id; });
      li.append(btn);
      ul.append(li);
    }
    sec.append(h, ul);
    gallery.append(sec);
  }
}

// ---------- wall color ----------
// The viewer's background is the art's own background color, from art.json's
// `bg` (measured from the full-size file; see `about.bg` there).
function setWall(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  // relative luminance decides light or dark caption text
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const dark = L < 0.35;
  viewer.style.setProperty("--wall", hex);
  viewer.style.setProperty("--ink", dark ? "#f6f2fa" : "#15111c");
  viewer.style.setProperty("--ink-soft", dark ? "rgb(246 242 250 / .74)" : "rgb(21 17 28 / .72)");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", hex);
}

// ---------- viewer ----------
function show(i) {
  const p = pieces[i];
  if (!p) return;
  current = i;
  vImg.classList.add("is-loading");
  vImg.alt = p.title;
  vImg.src = p.file;
  vTitle.textContent = p.title;
  vMeta.textContent = [fmtDate(p.date), `${i + 1} of ${pieces.length}`].filter(Boolean).join(", ");
  vLinks.innerHTML = "";
  vLinks.append(link(p.file, p.file.endsWith(".svg") ? "Open SVG" : "Open PNG"));
  document.title = `${p.title} | Mike Delmonaco’s Vector Art`;
  setWall(p.bg);
  // warm the neighbors so arrowing through is instant
  for (const j of [i - 1, i + 1]) new Image().src = pieces[(j + pieces.length) % pieces.length].file;
}

function link(href, text) {
  const a = document.createElement("a");
  a.href = href; a.textContent = text; a.target = "_blank"; a.rel = "noopener";
  return a;
}

vImg.addEventListener("load", () => vImg.classList.remove("is-loading"));

function open(i) {
  if (viewer.hidden) {
    lastFocus = document.activeElement;
    viewer.hidden = false;
    document.body.classList.add("viewer-open");
    viewer.querySelector(".viewer-close").focus({ preventScroll: true });
  }
  show(i);
}

function close() {
  if (viewer.hidden) return;
  const id = pieces[current]?.id;
  viewer.hidden = true;
  current = -1;
  document.body.classList.remove("viewer-open");
  document.title = "Mike Delmonaco’s Vector Art";
  // return focus to the tile of the piece that was showing, so keyboard users land where they were
  const tile = id && gallery.querySelector(`[data-id="${CSS.escape(id)}"]`);
  (tile || lastFocus)?.focus({ preventScroll: false });
}

const step = (d) => { location.replace("#" + pieces[(current + d + pieces.length) % pieces.length].id); };

function route() {
  const id = decodeURIComponent(location.hash.slice(1));
  const i = pieces.findIndex((p) => p.id === id);
  if (i >= 0) open(i);
  else close();
}

viewer.querySelector(".viewer-close").addEventListener("click", () => {
  history.replaceState(null, "", location.pathname + location.search);
  route();
});
viewer.querySelector(".viewer-prev").addEventListener("click", () => step(-1));
viewer.querySelector(".viewer-next").addEventListener("click", () => step(1));
// click on the empty wall around the art closes
viewer.querySelector(".viewer-stage").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) viewer.querySelector(".viewer-close").click();
});

document.addEventListener("keydown", (e) => {
  if (viewer.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape") viewer.querySelector(".viewer-close").click();
  else if (e.key === "ArrowLeft") step(-1);
  else if (e.key === "ArrowRight") step(1);
  else if (e.key === "Tab") {
    // keep focus inside the dialog
    const f = [...viewer.querySelectorAll("button, a[href]")];
    const k = f.indexOf(document.activeElement);
    if (e.shiftKey && k <= 0) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});

// swipe left/right on touch screens
let touchX = null, touchY = null;
viewer.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) { touchX = null; return; }
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
}, { passive: true });
viewer.addEventListener("touchend", (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
  touchX = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
});

window.addEventListener("hashchange", route);

// ---------- boot ----------
fetch("art.json")
  .then((r) => { if (!r.ok) throw new Error(`art.json: HTTP ${r.status}`); return r.json(); })
  .then((doc) => {
    pieces = doc.pieces;
    renderGrid();
    route();
    window.gallery = { pieces, open: (id) => { location.hash = id; }, wall: () => viewer.style.getPropertyValue("--wall") };
  })
  .catch((err) => {
    gallery.innerHTML = `<p class="gal-error">Couldn't load the art list (${err.message}). Reload the page to try again.</p>`;
  });
