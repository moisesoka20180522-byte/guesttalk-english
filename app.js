const prompts = [
  {
    question: "May I check the name on your reservation?",
    starter: "予約確認: May I check the name on your reservation?"
  },
  {
    question: "The Wi-Fi password is written here.",
    starter: "客室案内: The Wi-Fi password is written here."
  },
  {
    question: "There are a few good restaurants nearby.",
    starter: "周辺案内: There are a few good restaurants nearby."
  },
  {
    question: "I'm sorry for the inconvenience. I'll check it right away.",
    starter: "トラブル対応: I'm sorry for the inconvenience."
  },
  {
    question: "How was your stay?",
    starter: "チェックアウト: How was your stay?"
  }
];

const state = {
  messages: [],
  practiceCount: Number(localStorage.getItem("guesttalk-ai-count") || 0)
};

const els = {
  practiceCount: document.querySelector("#practiceCount"),
  aiScenario: document.querySelector("#aiScenario"),
  aiMessages: document.querySelector("#aiMessages"),
  aiForm: document.querySelector("#aiForm"),
  aiInput: document.querySelector("#aiInput"),
  newPrompt: document.querySelector("#newPrompt"),
  talkPrompt: document.querySelector("#talkPrompt"),
  answerStarter: document.querySelector("#answerStarter")
};

function renderCount() {
  els.practiceCount.textContent = String(state.practiceCount);
}

function addMessage(role, html) {
  const item = document.createElement("article");
  item.className = `message ${role}`;
  item.innerHTML = html;
  els.aiMessages.append(item);
  els.aiMessages.scrollTop = els.aiMessages.scrollHeight;
}

function showWelcome() {
  addMessage("assistant", `
    <strong>AI Guest</strong>
    <p>Hello! I just arrived. Is this the right place for check-in?</p>
    <small>英語で返事をすると、AIが宿泊ゲスト役で会話を続け、日本語で添削します。</small>
  `);
}

function showRandomPrompt() {
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  els.talkPrompt.textContent = prompt.question;
  els.answerStarter.textContent = prompt.starter;
}

function renderAiResponse(data) {
  addMessage("assistant", `
    <strong>AI Guest</strong>
    <p>${escapeHtml(data.guest_reply || "")}</p>
    <div class="feedback-box">
      <b>より自然な英語</b>
      <p>${escapeHtml(data.better_host_english || "いい感じです。このまま会話を続けましょう。")}</p>
      <b>日本語フィードバック</b>
      <p>${escapeHtml(data.japanese_feedback || "")}</p>
      <b>発音のコツ</b>
      <p>${escapeHtml(data.pronunciation_tip || "")}</p>
      <b>次の質問</b>
      <p>${escapeHtml(data.next_question || "")}</p>
    </div>
  `);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendAiMessage(event) {
  event.preventDefault();
  const text = els.aiInput.value.trim();
  if (!text) return;

  els.aiInput.value = "";
  state.messages.push({ role: "user", content: text });
  addMessage("user", `<strong>You</strong><p>${escapeHtml(text)}</p>`);

  const loading = document.createElement("article");
  loading.className = "message assistant loading";
  loading.textContent = "AIゲストが返事を考えています...";
  els.aiMessages.append(loading);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scenario: els.aiScenario.value,
        messages: state.messages
      })
    });

    const data = await response.json();
    loading.remove();

    if (!response.ok) {
      addMessage("assistant", `<strong>設定が必要です</strong><p>${escapeHtml(data.error || "AIサーバー設定を確認してください。")}</p>`);
      return;
    }

    state.messages.push({ role: "assistant", content: data.guest_reply || "" });
    state.practiceCount += 1;
    localStorage.setItem("guesttalk-ai-count", String(state.practiceCount));
    renderCount();
    renderAiResponse(data);
  } catch (error) {
    loading.remove();
    addMessage("assistant", `<strong>接続エラー</strong><p>${escapeHtml(error.message)}</p>`);
  }
}

els.aiForm.addEventListener("submit", sendAiMessage);
els.newPrompt.addEventListener("click", showRandomPrompt);
renderCount();
showWelcome();
showRandomPrompt();
