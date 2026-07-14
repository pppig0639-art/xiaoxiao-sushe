// 房間裝飾：用 Kenney.nl 的免費 CC0 美術素材(Furniture Kit，https://kenney.nl/assets/furniture-kit)，
// 房主可以勾選要不要放在自己房間，其他人在地圖上看得到。

import * as store from "../store.js";
import { updateDecorations } from "../db/rooms.js";

export const DECORATION_ITEMS = [
  { id: "desk", label: "書桌", image: "assets/sprites/furniture/desk_SE.png" },
  { id: "plant", label: "盆栽", image: "assets/sprites/furniture/pottedPlant_SE.png" },
  { id: "tv", label: "電視", image: "assets/sprites/furniture/televisionModern_SE.png" },
  { id: "rug", label: "地毯", image: "assets/sprites/furniture/rugRounded_SE.png" },
  { id: "bookshelf", label: "書櫃", image: "assets/sprites/furniture/bookcaseClosed_SE.png" },
  { id: "lamp", label: "檯燈", image: "assets/sprites/furniture/lampRoundFloor_SE.png" },
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

    const icon = document.createElement("img");
    icon.className = "decoration-icon";
    icon.src = item.image;
    icon.alt = "";

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
