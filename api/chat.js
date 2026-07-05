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
  beginner: "Beginner: use short, simple English. Teach one point at a time.",
  intermediate: "Intermediate: use natural English and concise correction.",
  advanced: "Advanced: use realistic English, nuance, and stricter correction."
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

function isExpressionQuestion(text) {
  const source = String(text || "").toLowerCase();
  return /영어로|어떻게 말|어떻게 표현|표현해|뭐라고 해|how do i say|how can i say|英語で|どう言|表現/.test(source);
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
  const lower = source.toLowerCase();
  if (!source) return "I want to practice English.";
  if (/안녕|こんにちは|おはよう|こんばんは|annyeong|anyeong/.test(source)) return "Hello. Nice to talk with you.";
  if (/i know how to say you|i know how to say yo|i don't know how to say you|i know say you|i know how say you/.test(lower)) return "Hello. Nice to talk with you.";
  if (/arigato|ありがとう|고마워|감사/.test(source)) return "Thank you.";
  if (/sumimasen|すみません|죄송|미안/.test(source)) return "I'm sorry.";
  if (/[a-z]/i.test(source)) return polishEnglish(source);
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

function expressionFallback(userText) {
  if (/체크인|check.?in|チェックイン/.test(userText)) {
    return [
      "Check-in starts at 3 p.m.",
      "You can check in from 3 p.m.",
      "Your room will be ready from 3 p.m."
    ];
  }
  if (/여기|場所|place|어디/.test(userText)) {
    return [
      "Is this the right place?",
      "Am I in the right place?",
      "Is this where I should check in?"
    ];
  }
  return [
    "How can I say this in English?",
    "What is a natural way to say this in English?",
    "How would you say this in everyday English?"
  ];
}

function localFallback({ topic, level, messages }) {
  const userText = lastUserText(messages);
  const expressionQuestion = isExpressionQuestion(userText);
  const questions = nextQuestions[topic] || nextQuestions.daily;
  const nextQuestion = questions[messages.length % questions.length];

  if (expressionQuestion) {
    const options = expressionFallback(userText);
    return {
      intent: "expression_question",
      partner_reply: `Try this: "${options[0]}" Please repeat it after me.`,
      better_user_english: options[0],
      expression_options: options,
      japanese_feedback: "英語でどう言うかを聞く時は、まず一番シンプルな表現を覚えると会話で使いやすいです。",
      pronunciation_tip: "文を全部同じ強さで読まず、大事な単語を少し強く言いましょう。",
      next_question: "Can you repeat that sentence once?",
      free_mode: true
    };
  }

  const better = simpleEnglishFromAnyLanguage(userText, topic);
  const levelTip = level === "advanced"
    ? "理由や具体例を足すと、より自然な上級英語になります。"
    : level === "intermediate"
      ? "自然です。次は because を使って理由を足してみましょう。"
      : "短い文で大丈夫です。主語と動詞をはっきり言いましょう。";

  return {
    intent: "conversation_practice",
    partner_reply: `Great. ${nextQuestion}`,
    better_user_english: better,
    expression_options: [],
    japanese_feedback: `無料練習モードです。${levelTip}`,
    pronunciation_tip: "英語は一語ずつ止めすぎず、短いかたまりで話すと自然です。",
    next_question: nextQuestion,
    free_mode: true
  };
}

function buildPrompt({ topic, level, recognitionLanguage, messages }) {
  const history = messages.slice(-12).map((message) => `${message.role === "user" ? "Learner" : "AI Partner"}: ${message.content}`).join("\n");
  return `
You are Everyday English Coach, a warm ChatGPT-style English teacher for daily conversation practice.

The learner may speak Korean, Japanese, or English. Infer the meaning, convert it into natural English, and teach useful daily English.
The browser speech recognizer may use the wrong locale and produce a phonetic or nonsensical transcript. If the transcript looks unnatural, infer the likely intended Korean/Japanese/English phrase instead of correcting the transcript literally.

You must detect the learner's intent:
- "conversation_practice": the learner is trying to chat or practice a sentence.
- "expression_question": the learner asks how to say something in English, for example Korean/Japanese questions like "이건 영어로 어떻게 말해?", "이런 상황에서 뭐라고 해?", "英語でどう言う？"

If intent is "expression_question":
1. Give 2 or 3 natural English options.
2. Explain when to use them in Japanese.
3. Give one pronunciation tip.
4. Make partner_reply a short English sentence the learner should repeat aloud.

If intent is "conversation_practice":
1. Correct the learner's expression into natural English.
2. Explain briefly in Japanese.
3. Give one pronunciation tip.
4. Continue with one easy spoken English question.

Recognizer locale: ${recognitionLanguage || "auto"}
Topic: ${topics[topic] || topics.daily}
Level: ${levels[level] || levels.beginner}

Conversation:
${history || "No conversation yet."}

Return only JSON:
{
  "intent": "conversation_practice or expression_question",
  "partner_reply": "one short English sentence to speak aloud to the learner",
  "better_user_english": "best natural English version of the learner's last message",
  "expression_options": ["optional natural English option 1", "optional option 2", "optional option 3"],
  "japanese_feedback": "teacher explanation in Japanese",
  "pronunciation_tip": "short pronunciation tip in Japanese",
  "next_question": "one next English practice question"
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
  const { topic = "daily", level = "beginner", recognitionLanguage = "auto", messages = [] } = body;
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
        input: buildPrompt({ topic, level, recognitionLanguage, messages }),
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
