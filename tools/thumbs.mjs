// Make a 960px-wide JPEG thumbnail in thumbs/ for every file in art/.
// The grid loads these; the viewer loads the full file from art/.
//
// Renders with headless Chromium rather than macOS `sips`, because sips draws
// some Inkscape SVGs wrong (it dropped the iris gradients in tet.svg).
//
//   npm run thumbs            only files whose thumbnail is missing or older
//   npm run thumbs -- --all   redo everything
import { chromium } from "playwright";
import { readdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const all = process.argv.includes("--all");
const WIDTH = 960;

const mtime = (p) => stat(p).then((s) => s.mtimeMs, () => 0);
const files = (await readdir(path.join(root, "art"))).filter((f) => /\.(svg|png)$/i.test(f));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 540 } });
for (const f of files) {
  const src = path.join(root, "art", f);
  const out = path.join(root, "thumbs", f.replace(/\.\w+$/, ".jpg"));
  if (!all && (await mtime(out)) > (await mtime(src))) continue;
  // draw the file as an <img>, the same way the gallery shows it
  await page.goto(pathToFileURL(path.join(root, "art")).href + "/"); // file:// folder listing = an HTML page in art/
  await page.setContent(
    `<style>html,body{margin:0;overflow:hidden}img{display:block;width:${WIDTH}px;height:auto}</style>` +
    `<img src="${encodeURI(f)}">`,
  );
  const height = await page.evaluate(async () => {
    const img = document.querySelector("img");
    await img.decode();
    return Math.round(img.getBoundingClientRect().height);
  });
  await page.setViewportSize({ width: WIDTH, height });
  await page.screenshot({ path: out, type: "jpeg", quality: 82 });
  console.log(path.relative(root, out));
}
await browser.close();
