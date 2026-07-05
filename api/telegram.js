const APP_URL = "https://guesttalk-english.vercel.app/?v=11";

function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function buildReply(text) {
  const lower = text.toLowerCase();
  if (!text || lower === "/start" || lower === "start") {
    return [
      "GuestTalk English bot is ready.",
      "",
      "Commands:",
      "링크 - open the English practice app",
      "상태 - check bot status",
      "도움말 - show help",
      "",
      "You can also send a short note like: 영어앱 링크"
    ].join("\n");
  }

  if (/^(링크|link|앱|영어앱|url)$/i.test(text) || /링크|english app|영어.?앱/.test(lower)) {
    return `English practice app:\n${APP_URL}`;
  }

  if (/^(상태|status)$/i.test(text)) {
    return "Bot is working. Vercel webhook is receiving Telegram messages.";
  }

  if (/^(도움말|help|\/help)$/i.test(text)) {
    return [
      "Available commands:",
      "링크 - app URL",
      "상태 - bot status",
      "도움말 - help",
      "",
      "Next step: connect GitHub Actions if you want deploy commands."
    ].join("\n");
  }

  if (/배포|deploy/i.test(text)) {
    return "Deploy command received, but GitHub Actions control is not connected yet. I can add that next.";
  }

  if (/수정|고쳐|만들|codex|코덱스/i.test(text)) {
    return "I received your request. Direct Codex execution from Telegram is not connected yet, but this bot is ready for the next integration step.";
  }

  return [
    "Message received.",
    "Try: 링크 / 상태 / 도움말",
    `App: ${APP_URL}`
  ].join("\n");
}

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set.");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false
    })
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || "Telegram sendMessage failed.");
  }
  return data;
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return jsonResponse(res, 200, {
      ok: true,
      service: "telegram-webhook",
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN)
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { ok: false, error: "Only GET and POST are allowed." });
  }

  let update;
  try {
    update = await readBody(req);
  } catch {
    return jsonResponse(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  const text = normalizeText(message?.text);
  if (!chatId) return jsonResponse(res, 200, { ok: true, ignored: "no chat id" });

  const allowedChatId = process.env.TELEGRAM_CHAT_ID;
  if (allowedChatId && String(chatId) !== String(allowedChatId)) {
    return jsonResponse(res, 200, { ok: true, ignored: "unauthorized chat" });
  }

  try {
    await sendTelegramMessage(chatId, buildReply(text));
    return jsonResponse(res, 200, { ok: true });
  } catch (error) {
    return jsonResponse(res, 500, { ok: false, error: error.message });
  }
};

module.exports.buildReply = buildReply;
