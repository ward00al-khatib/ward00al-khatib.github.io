// Prints the two CVs to /cv/ with headless Chrome. Edit cv-en.html / cv-ar.html, then:
//   node tools/cv/build-cv.js
//   node tools/cv/build-cv.js --copy-to "D:\folder"    also copies them there as Ward_Alkhatib_CV_EN.pdf / _AR.pdf
// Each CV must stay on one A4 page: the script stops if Chrome produced more than one.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(__dirname, "../..");
const at = process.argv.indexOf("--copy-to");
const copyTo = at > 0 ? process.argv[at + 1] : null;
fs.mkdirSync(path.join(ROOT, "cv"), { recursive: true });

for (const lang of ["en", "ar"]) {
  const src = "file:///" + encodeURI(path.join(__dirname, `cv-${lang}.html`).replace(/\\/g, "/"));
  const out = path.join(ROOT, "cv", `ward-alkhatib-cv-${lang}.pdf`);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=4000", `--print-to-pdf=${out}`, src], { stdio: "ignore" });
  const pdf = fs.readFileSync(out).toString("latin1");
  const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`cv/ward-alkhatib-cv-${lang}.pdf  ${Math.round(fs.statSync(out).size / 1024)} KB, ${pages} page(s)`);
  if (pages !== 1) throw new Error(`cv-${lang} runs to ${pages} pages: shorten it`);
  if (copyTo) {
    const copy = path.join(copyTo, `Ward_Alkhatib_CV_${lang.toUpperCase()}.pdf`);
    fs.copyFileSync(out, copy);
    console.log(`  copied to ${copy}`);
  }
}
