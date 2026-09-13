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
await browser.close();
