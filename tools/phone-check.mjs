// Loads a URL as an iPhone (touch, mobile UA, 390 x 844) and prints where it ends up, to prove the
// phone gate in index.html sends phones to the classic page.
//   node tools/phone-check.mjs [url]
import puppeteer from "puppeteer";
const url = process.argv[2] || "http://localhost:4173/";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
});
const kill = setTimeout(async () => { console.log("hard timeout, url now:", page.url()); await browser.close(); process.exit(2); }, 30000);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 }).catch((e) => console.log("goto:", e.message.split("\n")[0]));
await new Promise((r) => setTimeout(r, 5000));
console.log("final url:", page.url());
const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches).catch(() => "n/a");
console.log("pointer coarse:", coarse, " expected classic:", /\/classic\//.test(page.url()));
await page.screenshot({ path: "shots/phone.png" }).catch(() => {});
clearTimeout(kill);
await browser.close();
