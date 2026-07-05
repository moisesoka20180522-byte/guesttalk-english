const starters = [
  { question: "How was your day?", starter: "Example: It was pretty good. I was busy, but I had a nice lunch." },
  { question: "What do you usually do in the morning?", starter: "Example: I usually drink coffee and check my messages." },
  { question: "What kind of food do you like?", starter: "Example: I like spicy food, but I also enjoy simple home cooking." },
  { question: "What do you like to do on weekends?", starter: "Example: I like walking around town and trying new cafes." },
  { question: "Tell me about a place you want to visit.", starter: "Example: I want to visit Canada because I like nature." }
];

const ui = {
  voiceMode: "マイクで会話",
  textMode: "テキスト会話",
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級"
};

const speechLangs = {
  auto: "en-US",
  ko: "ko-KR",
  ja: "ja-JP",
  en: "en-US"
};

const state = {
  messages: [],
  practiceCount: Number(localStorage.getItem("guesttalk-ai-count") || 0),
  isSending: false,
  recognition: null,
  isListening: false
};

const els = {
  practiceCount: document.querySelector("#practiceCount"),
  conversationMode: document.querySelector("#conversationMode"),
  levelSelect: document.querySelector("#levelSelect"),
  topicSelect: document.querySelector("#topicSelect"),
  inputLanguage: document.querySelector("#inputLanguage"),
  aiMessages: document.querySelector("#aiMessages"),
  aiForm: document.querySelector("#aiForm"),
  aiInput: document.querySelector("#aiInput"),
  voiceButton: document.querySelector("#voiceButton"),
  resetChat: document.querySelector("#resetChat"),
  newPrompt: document.querySelector("#newPrompt"),
  talkPrompt: document.querySelector("#talkPrompt"),
  answerStarter: document.querySelector("#answerStarter")
};

function renderCount() {
  els.practiceCount.textContent = String(state.practiceCount);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMessage(role, html) {
  const item = document.createElement("article");
  item.className = `message ${role}`;
  item.innerHTML = html;
  els.aiMessages.append(item);
  els.aiMessages.scrollTop = els.aiMessages.scrollHeight;
}

function currentModeLabel() {
  return els.conversationMode.value === "voice" ? ui.voiceMode : ui.textMode;
}

function currentLevelLabel() {
  return ui[els.levelSelect.value] || ui.beginner;
}

function showWelcome() {
  addMessage("assistant", `
    <strong>AI Speak Partner</strong>
    <p>Hi! Say anything in Korean, Japanese, or English. I will turn it into natural English and keep the conversation going.</p>
    <small>${currentLevelLabel()}・${currentModeLabel()}。無料モードでも基本練習できます。</small>
  `);
}

function resetConversation() {
  state.messages = [];
  els.aiMessages.innerHTML = "";
  showWelcome();
}

function showRandomPrompt() {
  const prompt = starters[Math.floor(Math.random() * starters.length)];
  els.talkPrompt.textContent = prompt.question;
  els.answerStarter.textContent = prompt.starter;
}

function renderAiResponse(data) {
  const partnerReply = data.partner_reply || data.next_question || "";
  addMessage("assistant", `
    <strong>AI Speak Partner</strong>
    <p>${escapeHtml(partnerReply)}</p>
    <div class="feedback-box">
      <b>Natural English</b>
      <p>${escapeHtml(data.better_user_english || "Good. Keep going.")}</p>
      <b>日本語フィードバック</b>
      <p>${escapeHtml(data.japanese_feedback || "")}</p>
      <b>発音のコツ</b>
      <p>${escapeHtml(data.pronunciation_tip || "")}</p>
      <b>Next question</b>
      <p>${escapeHtml(data.next_question || "")}</p>
      ${data.free_mode ? "<small>Free practice mode: API料金なしで使える簡易AI練習です。</small>" : ""}
    </div>
  `);

  if (els.conversationMode.value === "voice") {
    speakText(partnerReply);
  }
}

async function sendAiMessage(event) {
  event.preventDefault();
  if (state.isSending) return;

  const text = els.aiInput.value.trim();
  if (!text) {
    addMessage("assistant", `
      <strong>入力してください</strong>
      <p>マイクで話すか、韓国語・日本語・英語で一文を書いてください。</p>
    `);
    els.aiInput.focus();
    return;
  }

  els.aiInput.value = "";
  state.messages.push({ role: "user", content: text });
  addMessage("user", `<strong>You</strong><p>${escapeHtml(text)}</p>`);

  state.isSending = true;
  const submitButton = els.aiForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "AI is replying...";

  const loading = document.createElement("article");
  loading.className = "message assistant loading";
  loading.textContent = "AI is thinking...";
  els.aiMessages.append(loading);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: els.conversationMode.value,
        level: els.levelSelect.value,
        topic: els.topicSelect.value,
        inputLanguage: els.inputLanguage.value,
        messages: state.messages
      })
    });

    const data = await response.json();
    loading.remove();

    if (!response.ok) {
      addMessage("assistant", `<strong>Server message</strong><p>${escapeHtml(data.error || "Please try again.")}</p>`);
      return;
    }

    state.messages.push({ role: "assistant", content: data.partner_reply || data.next_question || "" });
    state.practiceCount += 1;
    localStorage.setItem("guesttalk-ai-count", String(state.practiceCount));
    renderCount();
    renderAiResponse(data);
  } catch (error) {
    loading.remove();
    addMessage("assistant", `<strong>Connection error</strong><p>${escapeHtml(error.message)}</p>`);
  } finally {
    state.isSending = false;
    submitButton.disabled = false;
    submitButton.textContent = "AIに送る";
  }
}

function updateVoiceButton(status) {
  const icon = state.isListening ? "●" : "🎙";
  const label = status || (state.isListening ? "聞き取り中..." : "押して話す");
  els.voiceButton.innerHTML = `<span class="mic-icon">${icon}</span><strong>${label}</strong><small>話した後、AIに送るを押してください</small>`;
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.voiceButton.innerHTML = `<span class="mic-icon">×</span><strong>音声入力は未対応</strong><small>Chromeで開くか、テキストで練習してください</small>`;
    els.voiceButton.disabled = true;
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.interimResults = false;
  state.recognition.continuous = false;

  state.recognition.addEventListener("start", () => {
    state.isListening = true;
    updateVoiceButton("聞き取り中...");
  });

  state.recognition.addEventListener("result", (event) => {
    els.aiInput.value = Array.from(event.results).map((result) => result[0].transcript).join(" ");
    els.aiInput.focus();
  });

  state.recognition.addEventListener("end", () => {
    state.isListening = false;
    updateVoiceButton();
  });

  state.recognition.addEventListener("error", () => {
    state.isListening = false;
    updateVoiceButton("もう一度話す");
  });
}

function speakText(text) {
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = els.levelSelect.value === "beginner" ? 0.82 : els.levelSelect.value === "intermediate" ? 0.92 : 1;
  window.speechSynthesis.speak(utterance);
}

function updateMode() {
  document.body.dataset.mode = els.conversationMode.value;
}

function startVoiceInput() {
  if (!state.recognition || state.isListening) return;
  state.recognition.lang = speechLangs[els.inputLanguage.value] || "en-US";
  state.recognition.start();
}

els.aiForm.addEventListener("submit", sendAiMessage);
els.newPrompt.addEventListener("click", showRandomPrompt);
els.resetChat.addEventListener("click", resetConversation);
els.conversationMode.addEventListener("change", updateMode);
els.levelSelect.addEventListener("change", resetConversation);
els.topicSelect.addEventListener("change", resetConversation);
els.inputLanguage.addEventListener("change", () => {
  if (state.recognition) state.recognition.lang = speechLangs[els.inputLanguage.value] || "en-US";
});
els.voiceButton.addEventListener("click", startVoiceInput);

renderCount();
setupSpeechRecognition();
updateMode();
showWelcome();
showRandomPrompt();
