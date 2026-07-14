// 地圖與小人物 + 敲門系統。
// 客廳跟自己的房間可以直接進，別人的房間要「敲門」，對方同意才會被自動移進去。

import * as store from "../store.js";
import { updatePosition, updateAvatarChoice } from "../db/members.js";
import { requestKnock, respondToKnock, deleteKnock } from "../db/rooms.js";
import { sendAction } from "../db/actions.js";
import { DECORATION_ITEMS } from "./decorations.js";

// 基礎互動動作：點別人的小人物跳出選單，選一個送出去，對方畫面上會冒出一個泡泡。
// 沒有額外的動畫素材，用 emoji + 文字表示就好，重點是有來有往的即時感。
const ACTIONS = [
  { id: "greet", label: "打招呼", emoji: "👋" },
  { id: "wave", label: "揮手", emoji: "🙌" },
  { id: "hug", label: "抱抱", emoji: "🤗" },
  { id: "poke-head", label: "戳頭", emoji: "👆" },
  { id: "poke-shoulder", label: "拍肩膀", emoji: "🫱" },
  { id: "poke-hand", label: "打手", emoji: "✋" },
  { id: "poke-foot", label: "踢腳", emoji: "🦶" },
];

let roomBoxesEl = null;
let avatarLayerEl = null;
let roomActionsEl = null;
let knockBannerListEl = null;
let myKnockStatusEl = null;
let avatarOptionsEl = null;
let currentUid = null;
let dormId = null;

// uid -> 該人物在畫面上的 DOM 節點，重繪時盡量重複使用同一顆節點(只改 left/top)，
// 這樣 CSS 的 transition 才能真的「滑過去」，而不是整批砍掉重建變成用跳的。
const avatarEls = new Map();

// 目前開著的動作選單(同時間只會有一個)，以及已經顯示過的動作訊號 id(避免重複顯示)
let actionMenuEl = null;
const shownActionIds = new Set();

export function initMapView(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  roomBoxesEl = document.getElementById("room-boxes");
  avatarLayerEl = document.getElementById("avatar-layer");
  roomActionsEl = document.getElementById("room-actions");
  knockBannerListEl = document.getElementById("knock-banner-list");
  myKnockStatusEl = document.getElementById("my-knock-status");
  avatarOptionsEl = document.getElementById("avatar-options");

  store.subscribe("members", () => {
    renderRooms();
    renderRoomActions();
    renderMyKnockStatus();
    renderAvatarOptions();
  });
  store.subscribe("rooms", renderRooms);
  store.subscribe("incomingKnocks", renderIncomingKnocks);
  store.subscribe("actions", renderIncomingActions);

  roomBoxesEl.addEventListener("click", onMapClick);

  const settingsBtn = document.getElementById("map-settings-btn");
  const settingsPanel = document.getElementById("map-settings-panel");
  settingsBtn.addEventListener("click", () => {
    settingsPanel.hidden = !settingsPanel.hidden;
  });

  const editAvatarBtn = document.getElementById("edit-avatar-btn");
  const avatarEditor = document.getElementById("avatar-editor");
  editAvatarBtn.addEventListener("click", () => {
    avatarEditor.hidden = !avatarEditor.hidden;
  });
}

// 畫面一次只顯示「我人現在在的那個房間」(客廳/自己房間/被放進去的別人房間)，
// 不是同時攤開一整排房間格子 —— 所以點地圖永遠只是「在目前這個房間裡走過去」。
// 要去別的房間，靠房間裡的門(按鈕)：客廳裡有去敲每個室友門的門，私人房間裡有一扇「離開」的門。
function onMapClick(evt) {
  closeActionMenu();

  const myRoomId = currentRoomId();
  const isVisitor = myRole() === "visitor";
  if (isVisitor && myRoomId !== "common") return;

  const mapRect = roomBoxesEl.getBoundingClientRect();
  const xPct = clampPct(((evt.clientX - mapRect.left) / mapRect.width) * 100);
  const yPct = clampPct(((evt.clientY - mapRect.top) / mapRect.height) * 100);
  updatePosition(dormId, currentUid, myRoomId, xPct, yPct);
}

function closeActionMenu() {
  if (actionMenuEl) {
    actionMenuEl.remove();
    actionMenuEl = null;
  }
}

function openActionMenu(member, anchorEl) {
  closeActionMenu();
  const menu = document.createElement("div");
  menu.className = "action-menu";

  ACTIONS.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${action.emoji} ${action.label}`;
    btn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      sendAction(dormId, currentUid, memberName(currentUid), member.id, action.id);
      closeActionMenu();
    });
    menu.appendChild(btn);
  });

  menu.style.left = anchorEl.style.left;
  menu.style.top = anchorEl.style.top;
  avatarLayerEl.appendChild(menu);
  actionMenuEl = menu;
}

// 別人對我(或跟我同房間的人)送出的動作訊號，冒一個泡泡在對方頭上，幾秒後自己消失
function renderIncomingActions(actions) {
  actions.forEach((action) => {
    if (shownActionIds.has(action.id)) return;
    shownActionIds.add(action.id);

    const created = action.createdAt && action.createdAt.toDate ? action.createdAt.toDate() : null;
    if (created && Date.now() - created.getTime() > 6000) return; // 剛載入頁面時不要把舊訊號重播一次

    const targetEl = avatarEls.get(action.toUid);
    if (!targetEl) return; // 對方現在不在我看到的這個房間裡

    const meta = ACTIONS.find((a) => a.id === action.action);
    const bubble = document.createElement("div");
    bubble.className = "action-bubble";
    bubble.textContent = meta ? `${meta.emoji} ${action.fromName || "室友"}${meta.label}你！` : "👋";
    targetEl.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2200);
  });
}

function clampPct(v) {
  return Math.max(4, Math.min(96, v));
}

function currentRoomId() {
  const members = store.get("members") || [];
  const me = members.find((m) => m.id === currentUid);
  return (me && me.currentRoomId) || "common";
}

function knockOn(roomId) {
  const myKnock = myOutgoingKnock();
  const alreadyPending = myKnock && myKnock.roomId === roomId && myKnock.status === "pending";
  if (!alreadyPending) {
    requestKnock(dormId, roomId, currentUid, memberName(currentUid));
  }
}

// 每個人房間預設帶一點不同的顏色，這樣就算還沒手動裝飾，房間也不會長得一模一樣
const ROOM_TINTS = ["#f6c8b6", "#c8dfc0", "#c3d9ec", "#ead9f0", "#f5e3a8", "#d8c8b0", "#f0c3d0", "#c3ece0"];

function roomTint(uid, privateRoomIds) {
  const index = privateRoomIds.indexOf(uid);
  if (index === -1) return null;
  return ROOM_TINTS[index % ROOM_TINTS.length];
}

// 小人物造型：每個人可以自己選一種喜歡的角色(見 avatar-editor 面板)，選了就存在
// members/{uid}.avatarChoice；還沒選之前，依 uid 排序給一個預設值，重複也沒關係。
const AVATAR_OPTIONS = [
  { id: "pink", label: "粉髮雙馬尾", image: "assets/sprites/avatars/avatar-pink.png" },
  { id: "goth", label: "暗黑風格", image: "assets/sprites/avatars/avatar-goth.png" },
  { id: "glam", label: "名媛金髮", image: "assets/sprites/avatars/avatar-glam.png" },
  { id: "schoolgirl", label: "元氣少女", image: "assets/sprites/avatars/avatar-schoolgirl.png" },
];

function defaultAvatarId(uid) {
  const members = store.get("members") || [];
  const ids = members.map((m) => m.id).sort();
  const index = ids.indexOf(uid);
  return AVATAR_OPTIONS[(index === -1 ? 0 : index) % AVATAR_OPTIONS.length].id;
}

function avatarSprite(member) {
  const chosen = AVATAR_OPTIONS.find((o) => o.id === member.avatarChoice);
  if (chosen) return chosen.image;
  const fallback = AVATAR_OPTIONS.find((o) => o.id === defaultAvatarId(member.id));
  return fallback.image;
}

function myAvatarChoice() {
  const members = store.get("members") || [];
  const me = members.find((m) => m.id === currentUid);
  return (me && me.avatarChoice) || defaultAvatarId(currentUid);
}

function renderAvatarOptions() {
  if (!avatarOptionsEl) return;
  const selected = myAvatarChoice();
  avatarOptionsEl.innerHTML = "";

  AVATAR_OPTIONS.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `decoration-option${selected === item.id ? " is-selected" : ""}`;

    const icon = document.createElement("img");
    icon.className = "decoration-icon";
    icon.src = item.image;
    icon.alt = "";

    const label = document.createElement("span");
    label.textContent = item.label;

    btn.append(icon, label);
    btn.addEventListener("click", () => updateAvatarChoice(dormId, currentUid, item.id));
    avatarOptionsEl.appendChild(btn);
  });
}

function memberName(uid) {
  const members = store.get("members") || [];
  const m = members.find((x) => x.id === uid);
  return m ? m.displayName : "對方";
}

// 敲門結果直接鏡射在自己的 members 文件上（outgoingKnock 欄位），
// 不用另外訂閱 collection group query，省掉要另外設定 Firestore 索引的麻煩。
function myOutgoingKnock() {
  const members = store.get("members") || [];
  const me = members.find((m) => m.id === currentUid);
  return (me && me.outgoingKnock) || null;
}

function roomDecorations(roomId) {
  const rooms = store.get("rooms") || [];
  const room = rooms.find((r) => r.id === roomId);
  return (room && room.decorations) || [];
}

function myRole() {
  const members = store.get("members") || [];
  const me = members.find((m) => m.id === currentUid);
  return me ? me.role || "member" : "member";
}

function privateRoomIdsOf(members) {
  return members.filter((m) => m.role !== "visitor").map((m) => m.id).sort();
}

function renderRooms() {
  const members = store.get("members") || [];
  const myRoomId = currentRoomId();
  renderRoomBoxes(members, myRoomId);
  renderAvatars(members, myRoomId);
}

function renderRoomBoxes(members, myRoomId) {
  roomBoxesEl.innerHTML = "";
  const privateRoomIds = privateRoomIdsOf(members);
  const isVisitor = myRole() === "visitor";
  const isCommon = myRoomId === "common";

  const box = document.createElement("div");
  box.className = `room-box ${isCommon ? "room-box-common" : "room-box-private"}`;
  box.style.left = "0%";
  box.style.top = "0%";
  box.style.width = "100%";
  box.style.height = "100%";

  const label = document.createElement("span");
  label.className = "room-label";
  label.textContent = isCommon ? "客廳" : myRoomId === currentUid ? "我的房間" : `${memberName(myRoomId)}的房間`;
  box.appendChild(label);

  const tint = roomTint(myRoomId, privateRoomIds);
  if (tint) {
    box.style.boxShadow = `inset 0 0 0 999px ${tint}4d`;
  }

  // 固定家具(Kenney.nl 免費美術素材，見 assets/sprites/furniture)
  if (isCommon) {
    const rug = document.createElement("img");
    rug.className = "furniture furniture-rug";
    rug.src = "assets/sprites/furniture/rugRounded_SE.png";
    rug.alt = "";
    const sofa = document.createElement("img");
    sofa.className = "furniture furniture-sofa";
    sofa.src = "assets/sprites/furniture/loungeSofa_SE.png";
    sofa.alt = "";
    const table = document.createElement("img");
    table.className = "furniture furniture-coffee-table";
    table.src = "assets/sprites/furniture/tableCoffee_SE.png";
    table.alt = "";
    box.append(rug, sofa, table);

    // 每個室友房間的門，排成一排；點門 = 走過去敲門，不用敲很多次
    const doorRow = document.createElement("div");
    doorRow.className = "scene-doors";
    members
      .filter((m) => m.role !== "visitor" && m.id !== currentUid)
      .forEach((member) => {
        const doorBtn = document.createElement(isVisitor ? "div" : "button");
        if (!isVisitor) doorBtn.type = "button";
        doorBtn.className = "scene-door";
        const doorImg = document.createElement("img");
        doorImg.src = "assets/sprites/furniture/doorwayFront_SE.png";
        doorImg.alt = "";
        const doorLabel = document.createElement("span");
        doorLabel.textContent = `${member.displayName}的房間`;
        doorBtn.append(doorImg, doorLabel);
        if (!isVisitor) {
          doorBtn.addEventListener("click", (evt) => {
            evt.stopPropagation();
            knockOn(member.id);
          });
        }
        doorRow.appendChild(doorBtn);
      });
    box.appendChild(doorRow);
  } else {
    const bed = document.createElement("img");
    bed.className = "furniture furniture-bed";
    bed.src = "assets/sprites/furniture/bedSingle_SE.png";
    bed.alt = "";
    box.appendChild(bed);

    const decorations = roomDecorations(myRoomId);
    if (decorations.length > 0) {
      const chipRow = document.createElement("div");
      chipRow.className = "room-decorations";
      decorations.forEach((decoId) => {
        const item = DECORATION_ITEMS.find((d) => d.id === decoId);
        if (!item) return;
        const chip = document.createElement("img");
        chip.className = "room-decoration-chip";
        chip.src = item.image;
        chip.alt = "";
        chip.title = item.label;
        chipRow.appendChild(chip);
      });
      box.appendChild(chipRow);
    }

    // 離開房間、回客廳的門
    const exitBtn = document.createElement("button");
    exitBtn.type = "button";
    exitBtn.className = "scene-exit-door";
    const exitImg = document.createElement("img");
    exitImg.src = "assets/sprites/furniture/doorwayFront_SE.png";
    exitImg.alt = "";
    const exitLabel = document.createElement("span");
    exitLabel.textContent = "離開";
    exitBtn.append(exitImg, exitLabel);
    exitBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      updatePosition(dormId, currentUid, "common", 50, 90);
    });
    box.appendChild(exitBtn);
  }

  roomBoxesEl.appendChild(box);
}

// 每個人在自己房間格子裡的相對位置(posX/posY, 0~100)存在自己的 members 文件，
// 沒存過(舊資料/剛加入)就用 uid 算一個 30~70 之間的預設偏移，至少不會每個人都疊在正中間。
function defaultPos(uid, axis) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  const seed = axis === "x" ? hash : hash >> 8;
  return 35 + (seed % 30);
}

// 畫面只顯示「跟我在同一個房間裡」的人 —— 不用另外判斷隱私，因為我自己就只會站在
// 一個房間裡(客廳/自己房間/被放進去的別人房間)，只要 currentRoomId 跟我不一樣，
// 那個人本來就不會出現在我現在看到的這個場景裡。
function renderAvatars(members, myRoomId) {
  const visibleUids = new Set();

  members.forEach((member) => {
    const roomId = member.currentRoomId || "common";
    if (roomId !== myRoomId) return;

    visibleUids.add(member.id);
    const posX = member.posX ?? defaultPos(member.id, "x");
    const posY = member.posY ?? defaultPos(member.id, "y");
    updateAvatarEl(member, posX, posY);
  });

  // 人離開這個場景(換房間/離線又被清掉)，對應的小人物節點也要移除，不然會卡在畫面上
  for (const [uid, el] of avatarEls) {
    if (!visibleUids.has(uid)) {
      el.remove();
      avatarEls.delete(uid);
    }
  }
}

function updateAvatarEl(member, left, top) {
  const isVisitorMember = member.role === "visitor";
  let el = avatarEls.get(member.id);

  if (!el) {
    el = document.createElement("div");
    const shadow = document.createElement("div");
    shadow.className = "avatar-shadow";
    const sprite = document.createElement("img");
    sprite.className = "avatar-sprite";
    sprite.alt = "";
    const statusDot = document.createElement("span");
    statusDot.className = "avatar-status-dot";
    const nameTag = document.createElement("span");
    nameTag.className = "avatar-name";
    el.append(shadow, sprite, statusDot, nameTag);
    avatarLayerEl.appendChild(el);
    avatarEls.set(member.id, el);

    // 點別人的小人物跳出動作選單(打招呼/戳頭等)，不能對自己做動作
    const memberId = member.id;
    el.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (memberId === currentUid) return;
      const target = (store.get("members") || []).find((m) => m.id === memberId);
      if (target) openActionMenu(target, el);
    });
  }

  el.className = `avatar status-${member.status || "offline"}${isVisitorMember ? " avatar-visitor" : ""}`;

  // 移動速度用「實際要走的距離」算出動畫要花多久，而不是固定 0.3 秒不管走多遠都一樣快
  // (那樣近距離還好，稍微走遠一點就會像瞬移一樣快)。抓一個大約「走路」的速度感。
  const prevLeft = parseFloat(el.style.left);
  const prevTop = parseFloat(el.style.top);
  const mapRect = roomBoxesEl.getBoundingClientRect();
  const dxPx = (Number.isNaN(prevLeft) ? 0 : ((left - prevLeft) / 100) * mapRect.width);
  const dyPx = (Number.isNaN(prevTop) ? 0 : ((top - prevTop) / 100) * mapRect.height);
  const distancePx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
  const WALK_SPEED_PX_PER_SEC = 90;
  const duration = Math.min(2.2, Math.max(0.35, distancePx / WALK_SPEED_PX_PER_SEC));
  el.style.transitionDuration = `${duration}s, ${duration}s`;

  el.style.left = `${left}%`;
  el.style.top = `${top}%`;
  el.title = `${member.displayName || "?"}${isVisitorMember ? "（訪客）" : ""} ${member.mood || ""}`;
  el.querySelector(".avatar-sprite").src = avatarSprite(member);
  el.querySelector(".avatar-name").textContent = member.displayName ? member.displayName.slice(0, 2) : "?";
}

// 移動改成點地圖直接走過去，這裡只留「快速回到...」的捷徑按鈕，方便手機點不準的時候用。
function renderRoomActions() {
  const isVisitor = myRole() === "visitor";
  roomActionsEl.innerHTML = "";
  roomActionsEl.className = "map-hud-bottom room-switcher";

  const hint = document.createElement("span");
  hint.className = "map-hint";
  hint.textContent = "點地圖走過去，點門就是敲門";
  roomActionsEl.appendChild(hint);

  const commonBtn = document.createElement("button");
  commonBtn.textContent = "快速回客廳";
  commonBtn.addEventListener("click", () => updatePosition(dormId, currentUid, "common", 50, 50));
  roomActionsEl.appendChild(commonBtn);

  // 訪客沒有自己的房間、也不能敲別人的門（只能待在客廳看看）
  if (isVisitor) return;

  const ownRoomBtn = document.createElement("button");
  ownRoomBtn.textContent = "回我的房間";
  ownRoomBtn.addEventListener("click", () => updatePosition(dormId, currentUid, currentUid, 50, 50));
  roomActionsEl.appendChild(ownRoomBtn);
}

function renderMyKnockStatus() {
  const status = myOutgoingKnock();
  if (!status) {
    myKnockStatusEl.hidden = true;
    return;
  }

  myKnockStatusEl.hidden = false;
  if (status.status === "pending") {
    myKnockStatusEl.textContent = `已敲 ${memberName(status.roomId)} 的門，等待回應...`;
  } else if (status.status === "approved") {
    myKnockStatusEl.textContent = `${memberName(status.roomId)} 讓你進來了！`;
    updatePosition(dormId, currentUid, status.roomId, 50, 50);
    deleteKnock(dormId, status.roomId, currentUid);
  } else if (status.status === "denied") {
    myKnockStatusEl.textContent = `${memberName(status.roomId)} 現在不方便`;
    deleteKnock(dormId, status.roomId, currentUid);
  }
}

function renderIncomingKnocks(knocks) {
  knockBannerListEl.innerHTML = "";
  knocks.forEach((knock) => {
    const banner = document.createElement("div");
    banner.className = "knock-banner";

    const text = document.createElement("span");
    text.textContent = `${knock.requesterName} 想進來`;

    const actions = document.createElement("div");
    actions.className = "knock-actions";

    const approveBtn = document.createElement("button");
    approveBtn.textContent = "同意";
    approveBtn.addEventListener("click", () => respondToKnock(dormId, currentUid, knock.requesterUid, true));

    const denyBtn = document.createElement("button");
    denyBtn.textContent = "拒絕";
    denyBtn.addEventListener("click", () => respondToKnock(dormId, currentUid, knock.requesterUid, false));

    actions.append(approveBtn, denyBtn);
    banner.append(text, actions);
    knockBannerListEl.appendChild(banner);
  });
}
