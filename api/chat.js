const topics = {
  daily: "everyday life, routines, hobbies, feelings, weather, and small talk",
  self_intro: "self-introduction, family, hometown, personality, and interests",
  travel: "travel plans, transportation, hotels, sightseeing, and travel memories",
  food: "food, restaurants, cafes, cooking, ordering, and preferences",
  shopping: "shopping, prices, sizes, colors, returns, and recommendations",
  work: "work, schedules, meetings, business small talk, and daily tasks",
  friends: "casual friend talk about weekends, movies, music, plans, and recent news",
  free: "any natural topic the learner brings up"
};

const levels = {
  beginner: "Beginner: use short, simple English. Ask one easy question.",
  intermediate: "Intermediate: use natural English and concise correction.",
  advanced: "Advanced: use realistic English and stricter correction."
};

const nextQuestions = {
  daily: ["How was your day?", "What did you do today?", "What do you usually do after dinner?"],
  self_intro: ["What do you like to do in your free time?", "Where are you from?", "What kind of person are you?"],
  travel: ["Where do you want to travel next?", "Do you prefer cities or nature?", "What country do you want to visit?"],
  food: ["What did you eat today?", "What food do you like?", "Do you like cooking?"],
  shopping: ["What did you buy recently?", "Do you like shopping online?", "What color do you usually choose?"],
  work: ["Was work busy today?", "What kind of work do you do?", "What is one thing you need to do tomorrow?"],
  friends: ["What do you usually do with your friends?", "What are your weekend plans?", "Did you watch anything interesting recently?"],
  free: ["Tell me more about that.", "Why do you think so?", "What happened next?"]
};

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

function lastUserText(messages) {
  const last = [...messages].reverse().find((message) => message.role === "user");
  return String(last?.content || "").trim();
}

function polishEnglish(text) {
  let value = String(text || "").trim();
  if (!value) return "I want to practice English.";
  value = value.replace(/\bi went to cafe\b/gi, "I went to a cafe");
  value = value.replace(/\bi am go\b/gi, "I am going");
  value = value.replace(/\bi drinked\b/gi, "I drank");
  value = value.replace(/\bi very like\b/gi, "I really like");
  value = value.replace(/\bi no have\b/gi, "I don't have");
  value = value[0].toUpperCase() + value.slice(1);
  if (!/[.!?]$/.test(value)) value += ".";
  return value;
}

function simpleEnglishFromAnyLanguage(text, topic) {
  const source = String(text || "");
  if (!source) return "I want to practice English.";
  if (/[a-z]/i.test(source)) return polishEnglish(source);
  if (/안녕|こんにちは|おはよう|こんばんは/.test(source)) return "Hello. Nice to talk with you.";
  if (/카페|커피|カフェ|コーヒー/.test(source)) return "I went to a cafe today.";
  if (/친구|友達/.test(source)) return "I met my friend today.";
  if (/일|仕事|회사|会社/.test(source)) return "Work was busy today.";
  if (/여행|旅行/.test(source)) return "I want to travel soon.";
  if (/밥|ご飯|食|배고/.test(source)) return "I want to talk about food.";
  if (topic === "self_intro") return "Let me introduce myself.";
  if (topic === "travel") return "I want to talk about travel.";
  if (topic === "food") return "I want to talk about food.";
  if (topic === "work") return "I want to talk about work.";
  return "I want to talk about my day.";
}

function localFallback({ topic, level, messages }) {
  const better = simpleEnglishFromAnyLanguage(lastUserText(messages), topic);
  const questions = nextQuestions[topic] || nextQuestions.daily;
  const nextQuestion = questions[messages.length % questions.length];
  const levelTip = level === "advanced"
    ? "理由や具体例を足すと、より自然な上級英語になります。"
    : level === "intermediate"
      ? "自然です。次は because を使って理由を足してみましょう。"
      : "短い文で大丈夫です。主語と動詞をはっきり言いましょう。";

  return {
    partner_reply: `Great. ${nextQuestion}`,
    better_user_english: better,
    japanese_feedback: `無料練習モードです。${levelTip}`,
    pronunciation_tip: "英語は一語ずつ止めすぎず、短いかたまりで話すと自然です。",
    next_question: nextQuestion,
    free_mode: true
  };
}

function buildPrompt({ topic, level, messages }) {
  const history = messages.slice(-12).map((message) => `${message.role === "user" ? "Learner" : "AI Partner"}: ${message.content}`).join("\n");
  return `
You are Everyday English Speak, a voice conversation partner for an English learner.

The learner may speak Korean, Japanese, or English. Infer the meaning, convert it into natural English, and continue the conversation in spoken English.

Topic: ${topics[topic] || topics.daily}
Level: ${levels[level] || levels.beginner}

Conversation:
${history || "No conversation yet."}

Return only JSON:
{
  "partner_reply": "one or two short spoken English sentences. End with one easy question.",
  "better_user_english": "natural English version of the learner's last message",
  "japanese_feedback": "short correction explanation in Japanese",
  "pronunciation_tip": "short pronunciation tip in Japanese",
  "next_question": "the next English question"
}
`;
}

function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n");
}

function shouldUseFallback(status, message) {
  const text = String(message || "").toLowerCase();
  return status === 401 || status === 429 || text.includes("quota") || text.includes("billing") || text.includes("api key");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return jsonResponse(res, 204, {});
  if (req.method !== "POST") return jsonResponse(res, 405, { error: "Only POST is allowed." });

  let body;
  try { body = await readBody(req); } catch { return jsonResponse(res, 400, { error: "Request body must be valid JSON." }); }
  const { topic = "daily", level = "beginner", messages = [] } = body;
  if (!Array.isArray(messages)) return jsonResponse(res, 400, { error: "messages must be an array." });

  const fallback = () => localFallback({ topic, level, messages });
  if (!process.env.OPENAI_API_KEY) return jsonResponse(res, 200, fallback());

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: buildPrompt({ topic, level, messages }),
        text: { format: { type: "json_object" } }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data.error?.message || "OpenAI API request failed.";
      return shouldUseFallback(response.status, message)
        ? jsonResponse(res, 200, fallback())
        : jsonResponse(res, response.status, { error: message });
    }
    const text = extractText(data);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { ...fallback(), partner_reply: text || fallback().partner_reply };
    }
    jsonResponse(res, 200, parsed);
  } catch {
    jsonResponse(res, 200, fallback());
  }
};
