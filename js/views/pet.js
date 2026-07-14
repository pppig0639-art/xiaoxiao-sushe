// 寵物互動。
// 飽腹值/心情值不是存死的數字，是存「上次餵食/互動的時間」，畫面用經過的時間現算現在
// 該剩多少(見 db/pet.js 的 decayedValue) —— 所以這裡開一個計時器，每分鐘重畫一次，
// 數值才會自己慢慢往下掉，不用一直手動重新整理頁面。

import * as store from "../store.js";
import {
  feed,
  play,
  renamePet,
  setPetSpecies,
  decayedValue,
  HUNGER_DECAY_PER_HOUR,
  MOOD_DECAY_PER_HOUR,
  PET_SPECIES,
} from "../db/pet.js";

let cardEl = null;
let currentUid = null;
let dormId = null;
let latestPet = null;
let tickTimer = null;

export function initPetView(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  cardEl = document.getElementById("pet-card");
  store.subscribe("pet", (pet) => {
    latestPet = pet;
    renderPet();
  });

  if (!tickTimer) {
    tickTimer = setInterval(renderPet, 60 * 1000);
  }
}

function statBar(label, value) {
  const wrapper = document.createElement("div");
  const title = document.createElement("div");
  title.textContent = `${label} ${value}`;
  const bar = document.createElement("div");
  bar.className = "pet-stat-bar";
  const fill = document.createElement("span");
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  bar.appendChild(fill);
  wrapper.append(title, bar);
  return wrapper;
}

function renderPet() {
  const pet = latestPet;
  cardEl.innerHTML = "";
  if (!pet) {
    cardEl.textContent = "還沒有寵物資料";
    return;
  }

  const species = PET_SPECIES.find((s) => s.id === pet.species) || PET_SPECIES[0];
  const hunger = decayedValue(pet.hunger ?? 80, pet.lastFedAt, HUNGER_DECAY_PER_HOUR);
  const mood = decayedValue(pet.moodValue ?? 80, pet.lastPlayedAt, MOOD_DECAY_PER_HOUR);

  const emoji = document.createElement("div");
  emoji.className = "pet-emoji";
  emoji.textContent = species.emoji;

  const nameRow = document.createElement("div");
  nameRow.className = "pet-name-row";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = pet.name || "寵物";
  nameInput.maxLength = 12;
  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.textContent = "改名";
  renameBtn.addEventListener("click", () => {
    const next = nameInput.value.trim();
    if (next) renamePet(dormId, next);
  });
  nameRow.append(nameInput, renameBtn);

  const speciesRow = document.createElement("div");
  speciesRow.className = "pet-species-row";
  PET_SPECIES.forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `pet-species-option${s.id === species.id ? " is-selected" : ""}`;
    btn.textContent = s.emoji;
    btn.title = s.label;
    btn.addEventListener("click", () => setPetSpecies(dormId, s.id));
    speciesRow.appendChild(btn);
  });

  const feedBtn = document.createElement("button");
  feedBtn.textContent = "餵食";
  feedBtn.addEventListener("click", () => feed(dormId, currentUid));

  const playBtn = document.createElement("button");
  playBtn.textContent = "互動";
  playBtn.addEventListener("click", () => play(dormId, currentUid));

  cardEl.append(
    emoji,
    nameRow,
    speciesRow,
    statBar("飽腹值", hunger),
    statBar("心情值", mood),
    feedBtn,
    playBtn
  );
}
