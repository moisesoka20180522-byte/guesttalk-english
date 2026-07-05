const topics = {
  daily: "Talk about everyday life, routines, hobbies, feelings, weather, and simple personal opinions.",
  self_intro: "Practice self-introduction, family, hometown, personality, and interests.",
  travel: "Talk about travel plans, transportation, hotels, sightseeing, and travel memories.",
  food: "Talk about food, restaurants, cafes, cooking, ordering, and preferences.",
  shopping: "Talk about shopping, prices, sizes, colors, returns, and recommendations.",
  work: "Talk about work, schedules, meetings, simple business small talk, and daily tasks.",
  friends: "Talk casually like friends about weekends, movies, music, plans, and recent news.",
  free: "Have a natural free conversation about any topic the user brings up."
};

const levels = {
  beginner: "Beginner: use short, simple sentences. Ask one easy question at a time. Explain in very simple Japanese.",
  intermediate: "Intermediate: use natural but not difficult English. Correct the user's English with concise Japanese feedback.",
  advanced: "Advanced: use more natural, realistic English. Give stricter corrections and encourage longer answers."
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

function buildPrompt({ topic, level, mode, messages }) {
  const topicLine = topics[topic] || topics.daily;
  const levelLine = levels[level] || levels.beginner;
  const modeLine = mode === "voice"
    ? "The user is practicing speaking. Keep replies easy to say aloud and include pronunciation advice."
    : "The user is practicing by text. Keep the conversation natural and easy to continue.";
  const history = messages.slice(-10).map((message) => `${message.role === "user" ? "Learner" : "AI Partner"}: ${message.content}`).join("\n");
  return `
You are Everyday English AI, a friendly English conversation partner for a Japanese-speaking learner.

Topic:
${topicLine}

Level:
${levelLine}

Mode:
${modeLine}

Conversation so far:
${history || "No conversation yet."}

Task:
1. Continue the conversation as a friendly AI conversation partner in natural English.
2. Correct the learner's last English sentence kindly.
3. Explain the correction briefly in Japanese.
4. Give one pronunciation tip in Japanese.
5. Ask one realistic next question in English.

Return only JSON with these keys:
{
  "partner_reply": "one or two natural English sentences from the AI conversation partner",
  "better_user_english": "a corrected or more natural version of the learner's last English sentence",
  "japanese_feedback": "short Japanese explanation",
  "pronunciation_tip": "short Japanese pronunciation tip",
  "next_question": "one next question in English"
}
`;
}

function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  return output.flatMap((item) => Array.isArray(item.content) ? item.content : []).map((content) => content.text || "").filter(Boolean).join("\n");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return jsonResponse(res, 204, {});
  if (req.method !== "POST") return jsonResponse(res, 405, { error: "Only POST is allowed." });
  if (!process.env.OPENAI_API_KEY) return jsonResponse(res, 500, { error: "OPENAI_API_KEY is not set on the server." });

  let body;
  try { body = await readBody(req); } catch { return jsonResponse(res, 400, { error: "Request body must be valid JSON." }); }
  const { topic = "daily", level = "beginner", mode = "text", messages = [] } = body;
  if (!Array.isArray(messages)) return jsonResponse(res, 400, { error: "messages must be an array." });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: buildPrompt({ topic, level, mode, messages }),
        text: { format: { type: "json_object" } }
      })
    });
    const data = await response.json();
    if (!response.ok) return jsonResponse(res, response.status, { error: data.error?.message || "OpenAI API request failed." });
    const text = extractText(data);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        partner_reply: text,
        better_user_english: "",
        japanese_feedback: "AIの返答をJSONとして読み取れませんでした。もう一度試してください。",
        pronunciation_tip: "",
        next_question: ""
      };
    }
    jsonResponse(res, 200, parsed);
  } catch (error) {
    jsonResponse(res, 500, { error: error.message || "Unexpected server error." });
  }
};
