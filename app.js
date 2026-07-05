const starters = [
  { question: "오늘 뭐 했어? / 今日何をした？", starter: "Say it naturally. AI will answer in English." },
  { question: "요즘 좋아하는 음식은? / 最近好きな食べ物は？", starter: "You can answer in Korean, Japanese, or English." },
  { question: "주말에 뭐 하고 싶어? / 週末に何をしたい？", starter: "Speak freely. Short answers are fine." },
  { question: "어디 여행 가고 싶어? / どこへ旅行したい？", starter: "AI will correct it into natural English." },
  { question: "오늘 기분이 어때? / 今日の気分は？", starter: "After AI replies, answer the next question." }
];

const levelLabels = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級"
};

const state = {
  messages: [],
  practiceCount: Number(localStorage.getItem("guesttalk-ai-count") || 0),
  isSending: false,
  isConversationActive: false,
  isListening: false,
  recognition: null,
  languageIndex: 0,
  listenTimer: null,
  speechTimer: null,
  currentRecognitionLang: "",
  preferredRecognitionLang: "",
  lastResultAt: 0
};

const recognitionLangs = ["ko-KR", "ja-JP", "en-US"];

const els = {
  practiceCount: document.querySelector("#practiceCount"),
  levelSelect: document.querySelector("#levelSelect"),
  topicSelect: document.querySelector("#topicSelect"),
  aiMessages: document.querySelector("#aiMessages"),
  aiForm: document.querySelector("#aiForm"),
  aiInput: document.querySelector("#aiInput"),
  voiceButton: document.querySelector("#voiceButton"),
  voiceStatus: document.querySelector("#voiceStatus"),
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

function updateStatus(text) {
  els.voiceStatus.textContent = text;
}

function scheduleListening(delay = 700) {
  clearTimeout(state.listenTimer);
  if (!state.isConversationActive || state.isSending) return;
  state.listenTimer = setTimeout(startListening, delay);
}

function rotateRecognitionLanguage() {
  const langs = orderedRecognitionLangs();
  const current = state.currentRecognitionLang || state.preferredRecognitionLang || langs[0];
  const currentIndex = Math.max(0, langs.indexOf(current));
  state.preferredRecognitionLang = langs[(currentIndex + 1) % langs.length];
}

function showWelcome() {
  addMessage("assistant", `
    <strong>AI English Coach</strong>
    <p>Ask me how to say something in English, or speak freely for daily conversation practice.</p>
    <small>${levelLabels[els.levelSelect.value]}。無料モードでは簡易練習、API接続時はAI会話になります。</small>
  `);
}

function resetConversation() {
  stopConversation();
  state.messages = [];
  els.aiMessages.innerHTML = "";
  showWelcome();
  updateStatus("韓国語・日本語・英語、どれで話してもOKです。");
}

function showRandomPrompt() {
  const prompt = starters[Math.floor(Math.random() * starters.length)];
  els.talkPrompt.textContent = prompt.question;
  els.answerStarter.textContent = prompt.starter;
}

function renderAiResponse(data) {
  const partnerReply = data.partner_reply || data.next_question || "";
  const options = Array.isArray(data.expression_options) ? data.expression_options : [];
  const optionsHtml = options.length
    ? `<b>Expression options</b><ul class="expression-options">${options.map((option) => `<li>${escapeHtml(option)}</li>`).join("")}</ul>`
    : "";
  addMessage("assistant", `
    <strong>AI English Coach</strong>
    <p>${escapeHtml(data.better_user_english || "Good. Keep going.")}</p>
    <div class="feedback-box">
      ${optionsHtml}
      <b>AI voice reply</b>
      <p>${escapeHtml(partnerReply)}</p>
      <b>日本語フィードバック</b>
      <p>${escapeHtml(data.japanese_feedback || "")}</p>
      <b>Pronunciation</b>
      <p>${escapeHtml(data.pronunciation_tip || "")}</p>
      ${data.free_mode ? "<small>Free practice mode: API料金なしの簡易会話です。</small>" : ""}
    </div>
  `);
}

async function sendTextToAi(text, source = "voice") {
  if (state.isSending || !text.trim()) return;

  const userText = text.trim();
  els.aiInput.value = "";
  state.messages.push({ role: "user", content: userText });
  addMessage("user", `<strong>You said</strong><p>${escapeHtml(userText)}</p>`);

  state.isSending = true;
  updateStatus("AI is thinking...");
  els.aiForm.querySelector("button[type='submit']").disabled = true;

  const loading = document.createElement("article");
  loading.className = "message assistant loading";
  loading.textContent = "AI is preparing a voice reply...";
  els.aiMessages.append(loading);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "voice",
        level: els.levelSelect.value,
        topic: els.topicSelect.value,
        inputLanguage: "auto",
        recognitionLanguage: state.currentRecognitionLang || "auto",
        messages: state.messages
      })
    });

    const data = await response.json();
    loading.remove();

    if (!response.ok) {
      addMessage("assistant", `<strong>Server message</strong><p>${escapeHtml(data.error || "Please try again.")}</p>`);
      updateStatus("Server error. Try again.");
      return;
    }

    const reply = data.partner_reply || data.next_question || "";
    state.messages.push({ role: "assistant", content: reply });
    state.practiceCount += 1;
    localStorage.setItem("guesttalk-ai-count", String(state.practiceCount));
    renderCount();
    renderAiResponse(data);
    await speakText(reply);

    if (state.isConversationActive && source === "voice") {
      setTimeout(startListening, 600);
    }
  } catch (error) {
    loading.remove();
    addMessage("assistant", `<strong>Connection error</strong><p>${escapeHtml(error.message)}</p>`);
    updateStatus("Connection error. Try again.");
  } finally {
    state.isSending = false;
    els.aiForm.querySelector("button[type='submit']").disabled = false;
  }
}

function submitText(event) {
  event.preventDefault();
  const text = els.aiInput.value.trim();
  if (!text) {
    updateStatus("マイクで話すか、テキストを入力してください。");
    return;
  }
  sendTextToAi(text, "text");
}

function updateVoiceButton() {
  if (state.isConversationActive) {
    els.voiceButton.innerHTML = `<span class="mic-icon">■</span><strong>会話を止める</strong><small>AIの返事が終わると自動で聞きます</small>`;
  } else {
    els.voiceButton.innerHTML = `<span class="mic-icon">🎙</span><strong>会話を始める</strong><small>押したら自由に話してください</small>`;
  }
}

function orderedRecognitionLangs() {
  const browserLang = (navigator.language || "").toLowerCase();
  if (browserLang.startsWith("ja")) return ["ja-JP", "ko-KR", "en-US"];
  if (browserLang.startsWith("en")) return ["en-US", "ko-KR", "ja-JP"];
  return recognitionLangs;
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.voiceButton.disabled = true;
    els.voiceButton.innerHTML = `<span class="mic-icon">×</span><strong>音声入力は未対応</strong><small>Chromeで開くか、テキストで練習してください</small>`;
    updateStatus("このブラウザは音声入力に対応していません。");
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.interimResults = false;
  state.recognition.continuous = false;

  state.recognition.addEventListener("start", () => {
    state.isListening = true;
    updateStatus("Listening... Speak now.");
  });

  state.recognition.addEventListener("result", (event) => {
    const result = event.results[event.results.length - 1][0];
    const transcript = result.transcript.trim();
    state.isListening = false;
    state.lastResultAt = Date.now();
    if (!transcript) {
      updateStatus("I could not hear clearly. Please speak again.");
      rotateRecognitionLanguage();
      if (state.isConversationActive) scheduleListening(500);
      return;
    }
    state.preferredRecognitionLang = state.currentRecognitionLang;
    updateStatus(`Heard: ${transcript}`);
    sendTextToAi(transcript, "voice");
  });

  state.recognition.addEventListener("end", () => {
    state.isListening = false;
    if (Date.now() - state.lastResultAt < 1500) return;
    if (state.isConversationActive && !state.isSending) {
      rotateRecognitionLanguage();
      updateStatus("Listening restarted. Please speak again.");
      scheduleListening(500);
    }
  });

  state.recognition.addEventListener("error", (event) => {
    state.isListening = false;
    const message = event.error === "not-allowed"
      ? "マイクが許可されていません。ブラウザのマイク許可を確認してください。"
      : "音声を聞き取れませんでした。もう一度話してください。";
    updateStatus(message);
    if (event.error !== "not-allowed") {
      rotateRecognitionLanguage();
      scheduleListening(900);
    }
  });
}

function startListening() {
  if (!state.recognition || state.isListening || state.isSending || !state.isConversationActive) return;
  const langs = orderedRecognitionLangs();
  if (!state.preferredRecognitionLang) state.preferredRecognitionLang = langs[0];
  state.currentRecognitionLang = state.preferredRecognitionLang;
  state.recognition.lang = state.currentRecognitionLang;
  try {
    state.recognition.start();
  } catch {
    rotateRecognitionLanguage();
    scheduleListening(900);
  }
}

function startConversation() {
  state.isConversationActive = true;
  state.languageIndex = 0;
  state.preferredRecognitionLang = orderedRecognitionLangs()[0];
  state.currentRecognitionLang = state.preferredRecognitionLang;
  updateVoiceButton();
  startListening();
}

function stopConversation() {
  state.isConversationActive = false;
  clearTimeout(state.listenTimer);
  clearTimeout(state.speechTimer);
  if (state.recognition && state.isListening) state.recognition.stop();
  window.speechSynthesis?.cancel();
  updateVoiceButton();
}

function toggleConversation() {
  if (state.isConversationActive) {
    stopConversation();
    updateStatus("会話を停止しました。");
  } else {
    startConversation();
  }
}

function speakText(text) {
  return new Promise((resolve) => {
    if (!text || !("speechSynthesis" in window)) return resolve();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = els.levelSelect.value === "beginner" ? 0.82 : els.levelSelect.value === "intermediate" ? 0.92 : 1;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(state.speechTimer);
      updateStatus("Your turn. Speak naturally.");
      resolve();
    };
    utterance.onstart = () => updateStatus("AI is speaking...");
    utterance.onend = finish;
    utterance.onerror = finish;
    const fallbackMs = Math.min(12000, Math.max(3500, text.length * 85));
    state.speechTimer = setTimeout(finish, fallbackMs);
    window.speechSynthesis.speak(utterance);
  });
}

els.aiForm.addEventListener("submit", submitText);
els.newPrompt.addEventListener("click", showRandomPrompt);
els.resetChat.addEventListener("click", resetConversation);
els.levelSelect.addEventListener("change", resetConversation);
els.topicSelect.addEventListener("change", resetConversation);
els.voiceButton.addEventListener("click", toggleConversation);

renderCount();
setupSpeechRecognition();
showWelcome();
showRandomPrompt();
updateVoiceButton();
