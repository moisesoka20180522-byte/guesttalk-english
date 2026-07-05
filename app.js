const categories = [
  {
    id: "checkin",
    label: "체크인",
    phrases: [
      {
        ko: "예약자 성함을 확인해도 될까요?",
        en: "May I check the name on your reservation?",
        sound: "메이 아이 체크 더 네임 온 유어 레저베이션?"
      },
      {
        ko: "여권을 잠시 보여주시겠어요?",
        en: "Could I see your passport for a moment?",
        sound: "쿠드 아이 씨 유어 패스포트 포어 어 모먼트?"
      },
      {
        ko: "체크인은 오후 3시부터 가능합니다.",
        en: "Check-in starts at 3 p.m.",
        sound: "체크 인 스타츠 앳 쓰리 피 엠."
      },
      {
        ko: "짐은 여기 두셔도 됩니다.",
        en: "You can leave your luggage here.",
        sound: "유 캔 리브 유어 러기지 히어."
      }
    ]
  },
  {
    id: "room",
    label: "객실 안내",
    phrases: [
      {
        ko: "와이파이 비밀번호는 여기 적혀 있습니다.",
        en: "The Wi-Fi password is written here.",
        sound: "더 와이파이 패스워드 이즈 리튼 히어."
      },
      {
        ko: "수건은 욕실 선반에 있습니다.",
        en: "The towels are on the bathroom shelf.",
        sound: "더 타월즈 아 온 더 배스룸 셸프."
      },
      {
        ko: "밤 10시 이후에는 조용히 해주세요.",
        en: "Please keep it quiet after 10 p.m.",
        sound: "플리즈 킵 잇 콰이어트 애프터 텐 피 엠."
      },
      {
        ko: "난방은 이 리모컨으로 조절할 수 있어요.",
        en: "You can control the heater with this remote.",
        sound: "유 캔 컨트롤 더 히터 위드 디스 리모트."
      }
    ]
  },
  {
    id: "local",
    label: "동네 추천",
    phrases: [
      {
        ko: "근처에 좋은 식당이 몇 군데 있어요.",
        en: "There are a few good restaurants nearby.",
        sound: "데어 아 어 퓨 굿 레스토런츠 니어바이."
      },
      {
        ko: "걸어서 5분 정도 걸립니다.",
        en: "It takes about five minutes on foot.",
        sound: "잇 테익스 어바웃 파이브 미닛츠 온 풋."
      },
      {
        ko: "현지 음식을 드셔보고 싶다면 여기를 추천해요.",
        en: "If you want to try local food, I recommend this place.",
        sound: "이프 유 원트 투 트라이 로컬 푸드, 아이 레커멘드 디스 플레이스."
      },
      {
        ko: "이 길을 따라가다가 왼쪽으로 도세요.",
        en: "Go along this street and turn left.",
        sound: "고 얼롱 디스 스트리트 앤 턴 레프트."
      }
    ]
  },
  {
    id: "issues",
    label: "문제 대응",
    phrases: [
      {
        ko: "불편을 드려 죄송합니다.",
        en: "I'm sorry for the inconvenience.",
        sound: "아임 쏘리 포어 디 인컨비니언스."
      },
      {
        ko: "제가 바로 확인해보겠습니다.",
        en: "I'll check it right away.",
        sound: "아일 체크 잇 라이트 어웨이."
      },
      {
        ko: "다른 방으로 바꿔드릴 수 있습니다.",
        en: "I can move you to another room.",
        sound: "아이 캔 무브 유 투 어나더 룸."
      },
      {
        ko: "수리 담당자에게 연락하겠습니다.",
        en: "I'll contact the repair person.",
        sound: "아일 컨택트 더 리페어 퍼슨."
      }
    ]
  },
  {
    id: "checkout",
    label: "체크아웃",
    phrases: [
      {
        ko: "숙박은 어떠셨나요?",
        en: "How was your stay?",
        sound: "하우 워즈 유어 스테이?"
      },
      {
        ko: "열쇠는 여기에 두시면 됩니다.",
        en: "You can leave the key here.",
        sound: "유 캔 리브 더 키 히어."
      },
      {
        ko: "공항까지 택시가 필요하신가요?",
        en: "Do you need a taxi to the airport?",
        sound: "두 유 니드 어 택시 투 디 에어포트?"
      },
      {
        ko: "다음에 또 뵙길 바랍니다.",
        en: "I hope to see you again next time.",
        sound: "아이 호프 투 씨 유 어게인 넥스트 타임."
      }
    ]
  }
];

const prompts = [
  {
    question: "What brings you to this area?",
    starter: "Answer starter: I'm here for sightseeing / food / work / a short holiday."
  },
  {
    question: "Is this your first time in Korea?",
    starter: "Answer starter: Yes, it's my first time. / No, I've been here before."
  },
  {
    question: "What kind of food do you like?",
    starter: "Answer starter: I like spicy food, seafood, noodles, or something local."
  },
  {
    question: "Do you need any recommendations for today?",
    starter: "Answer starter: I recommend a market, a cafe, a walking route, or a local restaurant."
  },
  {
    question: "How was your trip here?",
    starter: "Answer starter: It was smooth, a little long, delayed, or easy to find."
  }
];

const state = {
  categoryId: categories[0].id,
  drillIndex: 0,
  practiceCount: 0,
  deferredInstallPrompt: null
};

const els = {
  categoryTabs: document.querySelector("#categoryTabs"),
  categoryTitle: document.querySelector("#categoryTitle"),
  phraseList: document.querySelector("#phraseList"),
  shufflePhrase: document.querySelector("#shufflePhrase"),
  drillKorean: document.querySelector("#drillKorean"),
  drillEnglish: document.querySelector("#drillEnglish"),
  drillPronunciation: document.querySelector("#drillPronunciation"),
  nextDrill: document.querySelector("#nextDrill"),
  markPracticed: document.querySelector("#markPracticed"),
  newPrompt: document.querySelector("#newPrompt"),
  talkPrompt: document.querySelector("#talkPrompt"),
  answerStarter: document.querySelector("#answerStarter"),
  practiceCount: document.querySelector("#practiceCount"),
  installCard: document.querySelector("#installCard"),
  installButton: document.querySelector("#installButton")
};

function todayKey() {
  return `guestEnglishPractice:${new Date().toISOString().slice(0, 10)}`;
}

function loadPracticeCount() {
  try {
    return Number(localStorage.getItem(todayKey()) || 0);
  } catch {
    return 0;
  }
}

function savePracticeCount() {
  try {
    localStorage.setItem(todayKey(), String(state.practiceCount));
  } catch {
    // The app remains usable when storage is blocked.
  }
}

function currentCategory() {
  return categories.find((category) => category.id === state.categoryId) || categories[0];
}

function currentPhrase() {
  const phrases = currentCategory().phrases;
  return phrases[state.drillIndex % phrases.length];
}

function renderCategories() {
  els.categoryTabs.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-tab";
    button.type = "button";
    button.role = "tab";
    button.textContent = category.label;
    button.setAttribute("aria-selected", String(category.id === state.categoryId));
    button.addEventListener("click", () => {
      state.categoryId = category.id;
      state.drillIndex = 0;
      render();
    });
    els.categoryTabs.append(button);
  });
}

function renderPhrases() {
  const category = currentCategory();
  els.categoryTitle.textContent = category.label;
  els.phraseList.innerHTML = "";

  category.phrases.forEach((phrase) => {
    const card = document.createElement("article");
    card.className = "phrase-card";
    card.innerHTML = `
      <p class="ko"></p>
      <p class="en"></p>
      <p class="sound"></p>
    `;
    card.querySelector(".ko").textContent = phrase.ko;
    card.querySelector(".en").textContent = phrase.en;
    card.querySelector(".sound").textContent = phrase.sound;
    els.phraseList.append(card);
  });
}

function renderDrill() {
  const phrase = currentPhrase();
  els.drillKorean.textContent = phrase.ko;
  els.drillEnglish.textContent = phrase.en;
  els.drillPronunciation.textContent = phrase.sound;
  els.practiceCount.textContent = String(state.practiceCount);
}

function showRandomPrompt() {
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  els.talkPrompt.textContent = prompt.question;
  els.answerStarter.textContent = prompt.starter;
}

function nextDrill() {
  state.drillIndex = (state.drillIndex + 1) % currentCategory().phrases.length;
  renderDrill();
}

function markPracticed() {
  state.practiceCount += 1;
  savePracticeCount();
  nextDrill();
}

function shufflePhrase() {
  const phraseCount = currentCategory().phrases.length;
  state.drillIndex = Math.floor(Math.random() * phraseCount);
  renderDrill();
}

function bindInstallPrompt() {
  if (!els.installButton || !els.installCard) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installCard.classList.add("can-install");
  });

  els.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) {
      els.installButton.textContent = "Chrome 메뉴에서 추가";
      return;
    }

    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    els.installCard.classList.remove("can-install");
  });

  window.addEventListener("appinstalled", () => {
    els.installCard.classList.add("installed");
    els.installButton.textContent = "설치 완료";
  });
}

function bindEvents() {
  els.nextDrill.addEventListener("click", nextDrill);
  els.markPracticed.addEventListener("click", markPracticed);
  els.shufflePhrase.addEventListener("click", shufflePhrase);
  els.newPrompt.addEventListener("click", showRandomPrompt);
  bindInstallPrompt();
}

function render() {
  renderCategories();
  renderPhrases();
  renderDrill();
}

state.practiceCount = loadPracticeCount();
bindEvents();
render();
showRandomPrompt();
