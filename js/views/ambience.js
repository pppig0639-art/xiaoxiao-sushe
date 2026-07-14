// 陪讀背景音：純個人功能，不用跟室友同步。
// 音檔來自 mixkit.co 免費音效庫(免費授權，個人/商業用途都可以，不需要標註來源)。

const SOUND_FILES = {
  white: "assets/sounds/white-noise.mp3",
  rain: "assets/sounds/rain.mp3",
  typing: "assets/sounds/typing.mp3",
};

let audioEl = null;

function setAmbience(type) {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.loop = true;
    audioEl.volume = 0.4;
  }

  if (type === "off" || !SOUND_FILES[type]) {
    audioEl.pause();
    return;
  }

  audioEl.src = SOUND_FILES[type];
  audioEl.play().catch((err) => {
    console.error("[ambience] play failed", err);
  });
}

export function initAmbienceControl() {
  const selectEl = document.getElementById("ambience-select");
  selectEl.addEventListener("change", () => setAmbience(selectEl.value));
}
