const starters = [
  { question: "What do you usually do in the morning?", starter: "例: I usually drink coffee and check my messages." },
  { question: "What kind of food do you like?", starter: "例: I like spicy food, but I also enjoy simple home cooking." },
  { question: "How was your day?", starter: "例: It was pretty good. I was busy, but I had a nice lunch." },
  { question: "What do you like to do on weekends?", starter: "例: I like walking around town and trying new cafes." },
  { question: "Tell me about a place you want to visit.", starter: "例: I want to visit Canada because I like nature." }
];

const modeLabels = { text: "テキスト会話", voice: "話す練習" };
const levelLabels = { beginner: "初級", intermediate: "中級", advanced: "上級" };
const state = {
  messages: [],
  practiceCount: Number(localStorage.getItem("guesttalk-ai-count") || 0),
  isSending: false,
  recognition: null
};

const els = {
  practiceCount: document.querySelector("#practiceCount"),
  conversationMode: document.querySelector("#conversationMode"),
  levelSelect: document.querySelector("#levelSelect"),
  topicSelect: document.querySelector("#topicSelect"),
  aiMessages: document.querySelector("#aiMessages"),
  aiForm: document.querySelector("#aiForm"),
  aiInput: document.querySelector("#aiInput"),
  voiceButton: document.querySelector("#voiceButton"),
  resetChat: document.querySelector("#resetChat"),
  newPrompt: document.querySelector("#newPrompt"),
  talkPrompt: document.querySelector("#talkPrompt"),
  answerStarter: document.querySelector("#answerStarter")
};

function renderCount() { els.practiceCount.textContent = String(state.practiceCount); }

function addMessage(role, html) {
  const item = document.createElement("article");
  item.className = `message ${role}`;
  item.innerHTML = html;
  els.aiMessages.append(item);
  els.aiMessages.scrollTop = els.aiMessages.scrollHeight;
}

function resetConversation() {
  state.messages = [];
  els.aiMessages.innerHTML = "";
  showWelcome();
}

function showWelcome() {
  const level = levelLabels[els.levelSelect.value];
  const mode = modeLabels[els.conversationMode.value];
  addMessage("assistant", `<strong>AI Partner</strong><p>Hi! Let's have a natural everyday conversation. How are you today?</p><small>${level}・${mode}。英語で返事をすると、AIが会話を続け、日本語でやさしく添削します。</small>`);
}

function showRandomPrompt() {
  const prompt = starters[Math.floor(Math.random() * starters.length)];
  els.talkPrompt.textContent = prompt.question;
  els.answerStarter.textContent = prompt.starter;
}

function renderAiResponse(data) {
  const partnerReply = data.partner_reply || data.guest_reply || "";
  addMessage("assistant", `
    <strong>AI Partner</strong>
    <p>${escapeHtml(partnerReply)}</p>
    <div class="feedback-box">
      <b>より自然な英語</b><p>${escapeHtml(data.better_user_english || data.better_host_english || "いい感じです。このまま会話を続けましょう。")}</p>
      <b>日本語フィードバック</b><p>${escapeHtml(data.japanese_feedback || "")}</p>
      <b>発音のコツ</b><p>${escapeHtml(data.pronunciation_tip || "")}</p>
      <b>次の質問</b><p>${escapeHtml(data.next_question || "")}</p>
    </div>`);
  if (els.conversationMode.value === "voice") speakText(partnerReply || data.next_question || "");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function toFriendlyError(message = "") {
  if (message.includes("quota") || message.includes("billing")) return "OpenAI APIの利用上限または支払い設定を確認してください。OpenAI PlatformでBillingを有効にするとAI会話が使えます。";
  if (message.includes("OPENAI_API_KEY")) return "VercelのEnvironment VariablesにOPENAI_API_KEYを設定してください。";
  return message || "AIサーバー設定を確認してください。";
}

async function sendAiMessage(event) {
  event.preventDefault();
  if (state.isSending) return;
  const text = els.aiInput.value.trim();
  if (!text) {
    addMessage("assistant", `<strong>入力してください</strong><p>英語で一文を書いてから送信してください。例: I usually drink coffee in the morning.</p>`);
    els.aiInput.focus();
    return;
  }
  els.aiInput.value = "";
  state.messages.push({ role: "user", content: text });
  addMessage("user", `<strong>You</strong><p>${escapeHtml(text)}</p>`);
  state.isSending = true;
  const submitButton = els.aiForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "AIが返答中...";
  const loading = document.createElement("article");
  loading.className = "message assistant loading";
  loading.textContent = "AIが返事を考えています...";
  els.aiMessages.append(loading);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: els.conversationMode.value,
        level: els.levelSelect.value,
        topic: els.topicSelect.value,
        messages: state.messages
      })
    });
    const data = await response.json();
    loading.remove();
    if (!response.ok) {
      addMessage("assistant", `<strong>設定が必要です</strong><p>${escapeHtml(toFriendlyError(data.error))}</p>`);
      return;
    }
    const partnerReply = data.partner_reply || data.guest_reply || "";
    state.messages.push({ role: "assistant", content: partnerReply });
    state.practiceCount += 1;
    localStorage.setItem("guesttalk-ai-count", String(state.practiceCount));
    renderCount();
    renderAiResponse(data);
  } catch (error) {
    loading.remove();
    addMessage("assistant", `<strong>接続エラー</strong><p>${escapeHtml(toFriendlyError(error.message))}</p>`);
  } finally {
    state.isSending = false;
    submitButton.disabled = false;
    submitButton.textContent = "AIに送る";
  }
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.voiceButton.textContent = "音声入力は未対応";
    els.voiceButton.disabled = true;
    return;
  }
  state.recognition = new SpeechRecognition();
  state.recognition.lang = "en-US";
  state.recognition.interimResults = false;
  state.recognition.continuous = false;
  state.recognition.addEventListener("start", () => { els.voiceButton.textContent = "聞き取り中..."; });
  state.recognition.addEventListener("result", (event) => {
    els.aiInput.value = Array.from(event.results).map((result) => result[0].transcript).join(" ");
  });
  state.recognition.addEventListener("end", () => { els.voiceButton.textContent = "マイクで話す"; });
  state.recognition.addEventListener("error", () => { els.voiceButton.textContent = "もう一度話す"; });
}

function speakText(text) {
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = els.levelSelect.value === "beginner" ? 0.82 : els.levelSelect.value === "intermediate" ? 0.92 : 1;
  window.speechSynthesis.speak(utterance);
}

function updateMode() { document.body.dataset.mode = els.conversationMode.value; }

els.aiForm.addEventListener("submit", sendAiMessage);
els.newPrompt.addEventListener("click", showRandomPrompt);
els.resetChat.addEventListener("click", resetConversation);
els.conversationMode.addEventListener("change", updateMode);
els.levelSelect.addEventListener("change", resetConversation);
els.topicSelect.addEventListener("change", resetConversation);
els.voiceButton.addEventListener("click", () => { if (state.recognition) state.recognition.start(); });

renderCount();
setupSpeechRecognition();
updateMode();
showWelcome();
showRandomPrompt();
