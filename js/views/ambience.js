// 陪讀背景音：純個人功能，不用跟室友同步，用 Web Audio API 現場生成，
// 不需要另外準備/授權音檔素材。只有三種簡單的環境音，之後想換成真的音樂檔案再說。

let audioCtx = null;
let activeSound = null;

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function makeNoiseBuffer(ctx) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playWhiteNoise(ctx) {
  const source = ctx.createBufferSource();
  source.buffer = makeNoiseBuffer(ctx);
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  source.connect(gain).connect(ctx.destination);
  source.start();
  return { stop: () => source.stop() };
}

function playRain(ctx) {
  const source = ctx.createBufferSource();
  source.buffer = makeNoiseBuffer(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.value = 0.18;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
  return { stop: () => source.stop() };
}

function playTyping(ctx) {
  let stopped = false;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(ctx.destination);

  function tick() {
    if (stopped) return;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 700 + Math.random() * 500;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.3, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(clickGain).connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
    setTimeout(tick, 80 + Math.random() * 220);
  }
  tick();

  return { stop: () => { stopped = true; } };
}

function setAmbience(type) {
  if (activeSound) {
    activeSound.stop();
    activeSound = null;
  }
  if (type === "off") return;

  const ctx = ensureContext();
  if (type === "white") activeSound = playWhiteNoise(ctx);
  else if (type === "rain") activeSound = playRain(ctx);
  else if (type === "typing") activeSound = playTyping(ctx);
}

export function initAmbienceControl() {
  const selectEl = document.getElementById("ambience-select");
  selectEl.addEventListener("change", () => setAmbience(selectEl.value));
}
