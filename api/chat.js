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
  beginner: "Beginner: use short, simple sentences. Ask one easy question at a time.",
  intermediate: "Intermediate: use natural but not difficult English. Correct clearly.",
  advanced: "Advanced: use realistic English. Give stricter corrections and encourage longer answers."
};

const nextQuestions = {
  daily: ["What did you do today?", "What do you usually do after dinner?", "How do you relax on busy days?"],
  self_intro: ["What do you like to do in your free time?", "How would you describe your personality?", "Where are you from?"],
  travel: ["Where do you want to travel next?", "What do you usually pack first?", "Do you prefer cities or nature?"],
  food: ["What did you eat today?", "What cafe or restaurant do you like?", "Can you cook any simple dishes?"],
  shopping: ["What did you buy recently?", "Do you like shopping online?", "What color do you usually choose?"],
  work: ["What kind of work do you do?", "Was work busy today?", "What is one thing you need to do tomorrow?"],
  friends: ["What do you usually do with your friends?", "Did you watch anything interesting recently?", "What are your weekend plans?"],
  free: ["Tell me more about that.", "Why do you feel that way?", "What happened next?"]
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
  if (!value) return "I want to practice English today.";
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
  const source = String(text || "").toLowerCase();
  if (!source) return "I want to practice English today.";
  if (/[a-z]/i.test(source)) return polishEnglish(text);
  if (/카페|커피|カフェ|コーヒー/.test(text)) return "I went to a cafe today.";
  if (/친구|友達/.test(text)) return "I met my friend today.";
  if (/일|仕事|회사|会社/.test(text)) return "Work was busy today.";
  if (/여행|旅行/.test(text)) return "I want to travel soon.";
  if (/배고|お腹|밥|ご飯|食/.test(text)) return "I want to talk about food.";
  if (topic === "self_intro") return "Let me introduce myself.";
  if (topic === "travel") return "I want to talk about travel.";
  if (topic === "food") return "I want to talk about food.";
  if (topic === "work") return "I want to talk about work.";
  return "I want to talk about my day.";
}

function localFallback({ topic, level, mode, messages }) {
  const userText = lastUserText(messages);
  const better = simpleEnglishFromAnyLanguage(userText, topic);
  const questions = nextQuestions[topic] || nextQuestions.daily;
  const nextQuestion = questions[messages.length % questions.length];
  const levelTip = level === "advanced"
    ? "もう少し詳しく、理由や例を足すと上級らしい英語になります。"
    : level === "intermediate"
      ? "文は自然です。次は理由を一文足してみましょう。"
      : "短い文で大丈夫です。主語 + 動詞をはっきり言いましょう。";
  const voiceTip = mode === "voice"
    ? "英語は一語ずつ止めすぎず、短いかたまりで読みます。"
    : "声に出す時は、最後の音まで軽く発音してみましょう。";

  return {
    partner_reply: `Nice. You can say: "${better}" ${nextQuestion}`,
    better_user_english: better,
    japanese_feedback: `無料練習モードです。${levelTip}`,
    pronunciation_tip: voiceTip,
    next_question: nextQuestion,
    free_mode: true
  };
}

function buildPrompt({ topic, level, mode, inputLanguage, messages }) {
  const topicLine = topics[topic] || topics.daily;
  const levelLine = levels[level] || levels.beginner;
  const modeLine = mode === "voice"
    ? "The user is practicing speaking. Keep replies easy to say aloud and include pronunciation advice."
    : "The user is practicing by text. Keep the conversation natural and easy to continue.";
  const languageLine = inputLanguage === "ko"
    ? "The user may answer in Korean. Understand the meaning, convert it into natural English, and continue in English."
    : inputLanguage === "ja"
      ? "The user may answer in Japanese. Understand the meaning, convert it into natural English, and continue in English."
      : "The user may answer in Korean, Japanese, or English. Understand the meaning and continue in English.";
  const history = messages.slice(-10).map((message) => `${message.role === "user" ? "Learner" : "AI Partner"}: ${message.content}`).join("\n");
  return `
You are Everyday English AI, a friendly English conversation partner for a Japanese-speaking learner.

Topic: ${topicLine}
Level: ${levelLine}
Mode: ${modeLine}
Input language: ${languageLine}

Conversation so far:
${history || "No conversation yet."}

Task:
1. Continue the conversation as a friendly AI partner in natural English.
2. If the learner used Korean or Japanese, translate the meaning into natural English.
3. Correct the learner's English kindly.
4. Explain the correction briefly in Japanese.
5. Give one pronunciation tip in Japanese.
6. Ask one realistic next question in English.

Return only JSON:
{
  "partner_reply": "one or two natural English sentences from the AI conversation partner",
  "better_user_english": "a corrected or natural English version of the learner's last message",
  "japanese_feedback": "short Japanese explanation",
  "pronunciation_tip": "short Japanese pronunciation tip",
  "next_question": "one next question in English"
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
  const { topic = "daily", level = "beginner", mode = "text", inputLanguage = "auto", messages = [] } = body;
  if (!Array.isArray(messages)) return jsonResponse(res, 400, { error: "messages must be an array." });

  const fallback = () => localFallback({ topic, level, mode, messages });
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
        input: buildPrompt({ topic, level, mode, inputLanguage, messages }),
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
  } catch (error) {
    jsonResponse(res, 200, fallback());
  }
};
