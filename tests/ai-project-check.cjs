const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(fs.existsSync(path.join(root, "api", "chat.js")), "api/chat.js must exist");
assert(fs.existsSync(path.join(root, "index.html")), "index.html must exist at project root");
assert(fs.existsSync(path.join(root, "app.js")), "app.js must exist at project root");
assert(fs.existsSync(path.join(root, "manifest.webmanifest")), "manifest.webmanifest must exist at project root");

const html = read("index.html");
assert(html.includes("topicSelect"), "daily conversation topic select must be present");
assert(html.includes("levelSelect"), "level select must be present");
assert(html.includes("conversationMode"), "conversation mode select must be present");
assert(html.includes("voiceButton"), "voice practice button must be present");
assert(html.includes("aiMessages"), "AI message history must be present");
assert(html.includes("manifest.webmanifest"), "PWA manifest must be linked");
assert(html.includes('lang="ja"'), "HTML language must be Japanese");
assert(html.includes("AI会話パートナー"), "Japanese AI partner label must be present");

const app = read("app.js");
assert(app.includes("fetch(\"/api/chat\""), "frontend must call /api/chat");
assert(app.includes("sendAiMessage"), "frontend must define sendAiMessage");
assert(app.includes("SpeechRecognition"), "frontend must support speech recognition");
assert(app.includes("speechSynthesis"), "frontend must support AI speech playback");

const api = read("api/chat.js");
assert(api.includes("OPENAI_API_KEY"), "API must read OPENAI_API_KEY from env");
assert(api.includes("https://api.openai.com/v1/responses"), "API must use OpenAI Responses API");
assert(api.includes("partner_reply"), "API prompt must request partner_reply");
assert(api.includes("better_user_english"), "API prompt must request better_user_english");
assert(api.includes("beginner"), "API must support beginner level");
assert(api.includes("intermediate"), "API must support intermediate level");
assert(api.includes("advanced"), "API must support advanced level");
assert(api.includes("daily"), "API must support daily conversation topic");
assert(api.includes("japanese_feedback"), "API prompt must request Japanese feedback");
assert(!api.includes("korean_feedback"), "API should not request Korean feedback");
assert(api.includes("module.exports"), "API must use Vercel-compatible CommonJS export");

console.log("AI project checks passed");
