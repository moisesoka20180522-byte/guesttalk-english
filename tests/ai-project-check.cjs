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
assert(html.includes("AI English Coach"), "English coach label must be present");
assert(html.includes("voiceButton"), "main voice button must be present");
assert(html.includes("voiceStatus"), "voice status must be present");
assert(!html.includes("inputLanguage"), "manual input language selector should be removed");
assert(!html.includes("conversationMode"), "manual conversation mode selector should be removed");
assert(html.includes("levelSelect"), "level selector must remain");
assert(html.includes("topicSelect"), "topic selector must remain");
assert(html.includes("v=10"), "cache-busting version must be updated");
assert(html.includes('lang="ja"'), "HTML language must be Japanese");

const app = read("app.js");
assert(app.includes('fetch("/api/chat"'), "frontend must call /api/chat");
assert(app.includes("toggleConversation"), "frontend must support live conversation toggle");
assert(app.includes("startListening"), "frontend must restart listening after AI voice reply");
assert(app.includes("scheduleListening"), "frontend must restart listening after silent speech recognition end");
assert(app.includes("speechTimer"), "frontend must recover if speech synthesis end event is missed");
assert(app.includes("preferredRecognitionLang"), "frontend must keep the last successful recognition language");
assert(app.includes("recognitionLanguage"), "frontend must send recognition locale to the API");
assert(app.includes("expression_options"), "frontend must render expression options");
assert(app.includes("AI English Coach"), "frontend must use English coach wording");
assert(app.includes("SpeechRecognition"), "frontend must support speech recognition");
assert(app.includes("speechSynthesis"), "frontend must support AI speech playback");
assert(app.includes("ko-KR"), "frontend must try Korean recognition");
assert(app.includes("ja-JP"), "frontend must try Japanese recognition");
assert(app.includes("en-US"), "frontend must try English recognition");
assert(app.includes("inputLanguage: \"auto\""), "frontend must send auto language mode to API");

const api = read("api/chat.js");
assert(api.includes("OPENAI_API_KEY"), "API must read OPENAI_API_KEY from env");
assert(api.includes("Everyday English Coach"), "API prompt must use English coach role");
assert(api.includes("localFallback"), "API must include no-payment local fallback");
assert(api.includes("free_mode"), "API fallback must mark free_mode");
assert(api.includes("Korean, Japanese, or English"), "API prompt must support multilingual user speech");
assert(api.includes("wrong locale"), "API prompt must handle wrong speech recognition locale");
assert(api.includes("i know how to say you"), "API fallback must handle common Korean greeting misrecognition");
assert(api.includes("expression_question"), "API must detect expression questions");
assert(api.includes("expression_options"), "API must return expression options");
assert(api.includes("https://api.openai.com/v1/responses"), "API must optionally use OpenAI Responses API");
assert(api.includes("partner_reply"), "API prompt must request partner_reply");
assert(api.includes("better_user_english"), "API prompt must request better_user_english");
assert(api.includes("japanese_feedback"), "API prompt must request Japanese feedback");
assert(api.includes("module.exports"), "API must use Vercel-compatible CommonJS export");

JSON.parse(read("manifest.webmanifest"));
JSON.parse(read("vercel.json"));

console.log("AI project checks passed");
