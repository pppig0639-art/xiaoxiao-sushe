// 房間裝飾：預設幾樣簡單的裝飾項目（用顏色色塊代表，不需要美術素材），
// 房主可以勾選要不要放在自己房間，其他人在地圖上看得到。

import * as store from "../store.js";
import { updateDecorations } from "../db/rooms.js";

export const DECORATION_ITEMS = [
  { id: "desk", label: "書桌", color: "#c8a165" },
  { id: "plant", label: "盆栽", color: "#6b9b5e" },
  { id: "poster", label: "海報", color: "#d4738a" },
  { id: "rug", label: "地毯", color: "#7a8fc4" },
  { id: "bookshelf", label: "書櫃", color: "#8a5a3b" },
  { id: "lamp", label: "檯燈", color: "#e8b84b" },
];

let dormId = null;
let currentUid = null;
let editorEl = null;
let optionsEl = null;
let editBtn = null;

export function initDecorationsView(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  editorEl = document.getElementById("decoration-editor");
  optionsEl = document.getElementById("decoration-options");
  editBtn = document.getElementById("edit-decorations-btn");

  editBtn.addEventListener("click", () => {
    editorEl.hidden = !editorEl.hidden;
  });

  store.subscribe("rooms", renderOptions);
}

function myRoom() {
  const rooms = store.get("rooms") || [];
  return rooms.find((r) => r.id === currentUid);
}

function renderOptions() {
  const room = myRoom();
  const selected = (room && room.decorations) || [];
  optionsEl.innerHTML = "";

  DECORATION_ITEMS.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `decoration-option${selected.includes(item.id) ? " is-selected" : ""}`;

    const icon = document.createElement("span");
    icon.className = "decoration-icon";
    icon.style.background = item.color;

    const label = document.createElement("span");
    label.textContent = item.label;

    btn.append(icon, label);
    btn.addEventListener("click", () => toggleItem(item.id, selected));
    optionsEl.appendChild(btn);
  });
}

function toggleItem(id, selected) {
  const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
  updateDecorations(dormId, currentUid, next);
}
