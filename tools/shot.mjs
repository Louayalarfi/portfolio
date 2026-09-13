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
// Narrow sizes emulate a phone (touch, mobile UA) so the WebGL2 and phone gate in index.html is exercised.
if (+w < 700) {
  await page.emulate({
    viewport: { width: +w, height: +h, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
} else {
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
}
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
// A page that redirects during load (the phone gate) can leave goto waiting, so a timeout is not fatal.
await page.goto(url, { waitUntil: "load", timeout: 45000 }).catch((e) => console.log("goto: " + e.message.split("\n")[0]));
await new Promise((r) => setTimeout(r, +waitMs));
await page.screenshot({ path: out });
const gl = await page.evaluate(() => { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); });
console.log(`saved ${out}  webgl:${gl}  errors:${errors.length}  url:${page.url()}`);
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
