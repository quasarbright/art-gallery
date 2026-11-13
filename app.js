// Vector art gallery: reads art.json, renders a grid grouped by year, and a
// full-screen viewer at #<piece-id>.

// TEMPORARY: only tet.svg has been copied from OneDrive so far. Any piece whose
// file is missing shows tet instead. Delete these two lines (and their uses in
// fallback()) once every file in art.json is in art/ and thumbs/.
const PLACEHOLDER_FILE = "art/tet.svg";
const PLACEHOLDER_THUMB = "thumbs/tet.jpg";

const gallery = document.getElementById("gallery");
const viewer = document.getElementById("viewer");
const vImg = viewer.querySelector(".viewer-img");
const vTitle = viewer.querySelector(".viewer-title");
const vMeta = viewer.querySelector(".viewer-meta");
const vDesc = viewer.querySelector(".viewer-desc");
const vLinks = viewer.querySelector(".viewer-links");

let pieces = [];
let current = -1;
let lastFocus = null;
const wallCache = new Map(); // piece id -> sampled background color

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtDate = (d) => (d ? dateFmt.format(new Date(d + "T00:00:00Z")) : "");

function fallback(img, placeholder) {
  img.addEventListener("error", () => {
    if (img.dataset.placeholder) return;
    img.dataset.placeholder = "1";
    img.src = placeholder;
  });
}

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
      fallback(img, PLACEHOLDER_THUMB);
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
// Sample the image's outer edge and take the per-channel median. Every piece
// is a flat-background wallpaper, so the edge is almost always the background.
function sampleWall(img) {
  const w = 64, h = Math.max(1, Math.round(64 * img.naturalHeight / img.naturalWidth)) || 36;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const r = [], g = [], b = [];
  const take = (x, y) => { const i = (y * w + x) * 4; r.push(data[i]); g.push(data[i + 1]); b.push(data[i + 2]); };
  for (let x = 0; x < w; x++) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y++) { take(0, y); take(w - 1, y); }
  const med = (a) => a.sort((m, n) => m - n)[a.length >> 1];
  return [med(r), med(g), med(b)];
}

function setWall(rgb) {
  const [r, g, b] = rgb;
  // relative luminance decides light or dark caption text
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const dark = L < 0.35;
  viewer.style.setProperty("--wall", `rgb(${r} ${g} ${b})`);
  viewer.style.setProperty("--ink", dark ? "#f6f2fa" : "#15111c");
  viewer.style.setProperty("--ink-soft", dark ? "rgb(246 242 250 / .74)" : "rgb(21 17 28 / .72)");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", `rgb(${r} ${g} ${b})`);
}

function wallFor(p) {
  if (wallCache.has(p.id)) return Promise.resolve(wallCache.get(p.id));
  return new Promise((resolve) => {
    const img = new Image();
    fallback(img, PLACEHOLDER_THUMB);
    img.onload = () => {
      let rgb = null;
      try { rgb = sampleWall(img); } catch { /* cross-origin or decode failure: keep the current wall */ }
      if (rgb) wallCache.set(p.id, rgb);
      resolve(rgb);
    };
    img.src = p.thumb;
  });
}

// ---------- viewer ----------
function captionText(p) {
  // Tweets start with the title on its own line, then hashtags. Show only what
  // the title doesn't already say.
  if (!p.description) return "";
  const lines = p.description.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length && lines[0].toLowerCase() === p.title.toLowerCase().replace(/\s*\(.*\)$/, "")) lines.shift();
  return lines.join(" ");
}

function show(i) {
  const p = pieces[i];
  if (!p) return;
  current = i;
  vImg.classList.add("is-loading");
  vImg.removeAttribute("data-placeholder");
  vImg.alt = p.title;
  vImg.src = p.file;
  vTitle.textContent = p.title;
  vMeta.textContent = [fmtDate(p.date), `${i + 1} of ${pieces.length}`].filter(Boolean).join(", ");
  vDesc.textContent = captionText(p);
  vLinks.innerHTML = "";
  if (p.tweet) vLinks.append(link(p.tweet, "View post on X"));
  vLinks.append(link(p.file, p.file.endsWith(".svg") ? "Open SVG" : "Open PNG"));
  document.title = `${p.title} | Mike Delmonaco’s Vector Art`;
  wallFor(p).then((rgb) => { if (current === i && rgb) setWall(rgb); });
  // warm the neighbors so arrowing through is instant
  for (const j of [i - 1, i + 1]) {
    const q = pieces[(j + pieces.length) % pieces.length];
    wallFor(q);
  }
}

function link(href, text) {
  const a = document.createElement("a");
  a.href = href; a.textContent = text; a.target = "_blank"; a.rel = "noopener";
  return a;
}

vImg.addEventListener("load", () => vImg.classList.remove("is-loading"));
fallback(vImg, PLACEHOLDER_FILE);

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
