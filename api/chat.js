const scenarios = {
  checkin: "You are a friendly guest checking in at a small guesthouse or private lodging.",
  room: "You are a guest asking about room facilities, Wi-Fi, towels, heating, and house rules.",
  local: "You are a guest asking for local restaurant, cafe, transport, and sightseeing recommendations.",
  issues: "You are a guest politely reporting a problem such as noise, heating, lost keys, or a bathroom issue.",
  checkout: "You are a guest checking out and asking about taxi, luggage, payment, or the next visit.",
  smalltalk: "You are a relaxed guest having natural small talk with a guesthouse host."
};

function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function buildPrompt(scenario, messages) {
  const scenarioLine = scenarios[scenario] || scenarios.smalltalk;
  const history = messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "Host" : "Guest"}: ${message.content}`)
    .join("\n");

  return `
You are GuestTalk English, an AI conversation partner for a Japanese-speaking guesthouse host who wants to practice practical English.

Scenario:
${scenarioLine}

Conversation so far:
${history || "No conversation yet."}

Task:
1. Continue as the guest in natural English.
2. If the host wrote English, correct it kindly.
3. Explain the correction briefly in Japanese.
4. Give one pronunciation tip in Japanese.
5. Ask the next realistic guest question.

Return only JSON with these keys:
{
  "guest_reply": "one or two natural English sentences from the guest",
  "better_host_english": "a corrected or more natural version of the host's last English sentence",
  "japanese_feedback": "short Japanese explanation",
  "pronunciation_tip": "short Japanese pronunciation tip",
  "next_question": "one next guest question in English"
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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "Only POST is allowed." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    jsonResponse(res, 500, {
      error: "OPENAI_API_KEY is not set on the server."
    });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    jsonResponse(res, 400, { error: "Request body must be valid JSON." });
    return;
  }

  const { scenario = "smalltalk", messages = [] } = body;

  if (!Array.isArray(messages)) {
    jsonResponse(res, 400, { error: "messages must be an array." });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: buildPrompt(scenario, messages),
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      jsonResponse(res, response.status, {
        error: data.error?.message || "OpenAI API request failed."
      });
      return;
    }

    const text = extractText(data);
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        guest_reply: text,
        better_host_english: "",
        japanese_feedback: "AIの返答をJSONとして読み取れませんでした。もう一度試してください。",
        pronunciation_tip: "",
        next_question: ""
      };
    }

    jsonResponse(res, 200, parsed);
  } catch (error) {
    jsonResponse(res, 500, {
      error: error.message || "Unexpected server error."
    });
  }
};
