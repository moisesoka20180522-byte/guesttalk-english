const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const html = read("index.html");

assert(html.includes('rel="manifest"'), "index.html must link a web app manifest");
assert(html.includes("serviceWorker"), "index.html must register a service worker");
assert(fs.existsSync(path.join(root, "manifest.webmanifest")), "manifest.webmanifest must exist");
assert(fs.existsSync(path.join(root, "service-worker.js")), "service-worker.js must exist");

const manifest = JSON.parse(read("manifest.webmanifest"));
assert(manifest.name === "GuestTalk English", "manifest name must be GuestTalk English");
assert(manifest.short_name === "GuestTalk", "manifest short_name must be GuestTalk");
assert(manifest.display === "standalone", "manifest display must be standalone");
assert(manifest.start_url === "./index.html", "manifest start_url must be ./index.html");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "manifest must define app icons");

const serviceWorker = read("service-worker.js");
["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest"].forEach((asset) => {
  assert(serviceWorker.includes(asset), `service worker must cache ${asset}`);
});

console.log("PWA checks passed");
