// shot.mjs - headless screenshot of a URL so a session without a browser can SEE the page.
//   node shot.mjs <url> <out.png> [waitMs] [width] [height]
// Uses software WebGL (SwiftShader) so Three.js scenes render without a GPU.
import puppeteer from "puppeteer";
const [url, out = "shot.png", waitMs = "4000", w = "1440", h = "900"] = process.argv.slice(2);
// Use the system Chrome; puppeteer's own download was incomplete on this PC.
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await puppeteer.launch({
  headless: true, executablePath: CHROME,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
         "--ignore-gpu-blocklist", "--no-sandbox", `--window-size=${w},${h}`],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, +waitMs));
await page.screenshot({ path: out });
const gl = await page.evaluate(() => { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); });
console.log(`saved ${out}  webgl:${gl}  errors:${errors.length}`);
for (const e of errors.slice(0, 8)) console.log("  " + e);
// The world report: every mount with its port, cable and project count, plus anything unresolved.
const report = await page.evaluate(() => {
  const w = window.__world; if (!w) return null;
  const r = w.report();
  const s = window.__app?.cam?.state?.();
  return { rows: r.mounts, unresolved: r.unresolved, state: s };
}).catch(() => null);
if (report) {
  for (const m of report.rows) console.log(`  mount ${m.mount.padEnd(14)} ${m.kind.padEnd(7)} ${m.port.padEnd(16)} ${m.cable.padEnd(6)} ${m.device.padEnd(12)} projects:${m.projects} len:${m.cableLen}`);
  console.log(`  unresolved: ${report.unresolved.length ? report.unresolved.join("; ") : "none"}`);
  if (report.state) console.log(`  camera: ${JSON.stringify(report.state)}`);
}
await browser.close();
