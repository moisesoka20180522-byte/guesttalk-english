const prompts = [
  {
    question: "May I check the name on your reservation?",
    starter: "예약 확인: May I check the name on your reservation?"
  },
  {
    question: "The Wi-Fi password is written here.",
    starter: "객실 안내: The Wi-Fi password is written here."
  },
  {
    question: "There are a few good restaurants nearby.",
    starter: "동네 추천: There are a few good restaurants nearby."
  },
  {
    question: "I'm sorry for the inconvenience. I'll check it right away.",
    starter: "문제 대응: I'm sorry for the inconvenience."
  },
  {
    question: "How was your stay?",
    starter: "체크아웃: How was your stay?"
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
    <small>영어로 답하면 AI가 손님 역할로 이어가고, 표현을 고쳐줍니다.</small>
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
      <b>더 자연스러운 내 표현</b>
      <p>${escapeHtml(data.better_host_english || "좋아요. 계속 대화를 이어가세요.")}</p>
      <b>피드백</b>
      <p>${escapeHtml(data.korean_feedback || "")}</p>
      <b>발음 팁</b>
      <p>${escapeHtml(data.pronunciation_tip || "")}</p>
      <b>다음 질문</b>
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
  loading.textContent = "AI 손님이 답변 중입니다...";
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
      addMessage("assistant", `<strong>설정 필요</strong><p>${escapeHtml(data.error || "AI 서버 설정을 확인해 주세요.")}</p>`);
      return;
    }

    state.messages.push({ role: "assistant", content: data.guest_reply || "" });
    state.practiceCount += 1;
    localStorage.setItem("guesttalk-ai-count", String(state.practiceCount));
    renderCount();
    renderAiResponse(data);
  } catch (error) {
    loading.remove();
    addMessage("assistant", `<strong>연결 오류</strong><p>${escapeHtml(error.message)}</p>`);
  }
}

els.aiForm.addEventListener("submit", sendAiMessage);
els.newPrompt.addEventListener("click", showRandomPrompt);
renderCount();
showWelcome();
showRandomPrompt();
