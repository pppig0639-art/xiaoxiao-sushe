// 寵物互動。

import * as store from "../store.js";
import { feed, play } from "../db/pet.js";

let cardEl = null;
let currentUid = null;
let dormId = null;

export function initPetView(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  cardEl = document.getElementById("pet-card");
  store.subscribe("pet", renderPet);
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

function renderPet(pet) {
  cardEl.innerHTML = "";
  if (!pet) {
    cardEl.textContent = "還沒有寵物資料";
    return;
  }

  const name = document.createElement("h2");
  name.textContent = pet.name || "寵物";

  const feedBtn = document.createElement("button");
  feedBtn.textContent = "餵食";
  feedBtn.addEventListener("click", () => feed(dormId, currentUid));

  const playBtn = document.createElement("button");
  playBtn.textContent = "互動";
  playBtn.addEventListener("click", () => play(dormId, currentUid));

  cardEl.append(
    name,
    statBar("飢餓值", pet.hunger ?? 0),
    statBar("心情值", pet.moodValue ?? 0),
    feedBtn,
    playBtn
  );
}
