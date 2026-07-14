// 地圖與小人物 + 敲門系統。
// 客廳跟自己的房間可以直接進，別人的房間要「敲門」，對方同意才會被自動移進去。

import * as store from "../store.js";
import { updateCurrentRoom } from "../db/members.js";
import { requestKnock, respondToKnock, deleteKnock } from "../db/rooms.js";
import { DECORATION_ITEMS } from "./decorations.js";

let mapEl = null;
let roomActionsEl = null;
let knockBannerListEl = null;
let myKnockStatusEl = null;
let currentUid = null;
let dormId = null;

export function initMapView(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  mapEl = document.getElementById("room-map");
  roomActionsEl = document.getElementById("room-actions");
  knockBannerListEl = document.getElementById("knock-banner-list");
  myKnockStatusEl = document.getElementById("my-knock-status");

  store.subscribe("members", () => {
    renderRooms();
    renderRoomActions();
    renderMyKnockStatus();
  });
  store.subscribe("rooms", renderRooms);
  store.subscribe("incomingKnocks", renderIncomingKnocks);

  const settingsBtn = document.getElementById("map-settings-btn");
  const settingsPanel = document.getElementById("map-settings-panel");
  settingsBtn.addEventListener("click", () => {
    settingsPanel.hidden = !settingsPanel.hidden;
  });
}

// 每個人房間預設帶一點不同的顏色，這樣就算還沒手動裝飾，房間也不會長得一模一樣
const ROOM_TINTS = ["#f6c8b6", "#c8dfc0", "#c3d9ec", "#ead9f0", "#f5e3a8", "#d8c8b0", "#f0c3d0", "#c3ece0"];

function roomTint(uid, privateRoomIds) {
  const index = privateRoomIds.indexOf(uid);
  if (index === -1) return null;
  return ROOM_TINTS[index % ROOM_TINTS.length];
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

// 訪客沒有自己的房間，只有正式室友(role !== "visitor")才會生成私人房間格子
function buildRoomRects(members) {
  const ids = members.filter((m) => m.role !== "visitor").map((m) => m.id).sort();
  const rects = {};
  const n = Math.max(ids.length, 1);

  ids.forEach((uid, i) => {
    rects[uid] = { left: (i * 100) / n, top: 0, width: 100 / n, height: 42 };
  });
  rects.common = { left: 0, top: 46, width: 100, height: 54 };
  return rects;
}

function renderRooms() {
  const members = store.get("members") || [];
  mapEl.innerHTML = "";
  const rects = buildRoomRects(members);
  const privateRoomIds = Object.keys(rects).filter((id) => id !== "common");

  Object.entries(rects).forEach(([roomId, rect]) => {
    const box = document.createElement("div");
    box.className = `room-box ${roomId === "common" ? "room-box-common" : "room-box-private"}`;
    box.style.left = `${rect.left}%`;
    box.style.top = `${rect.top}%`;
    box.style.width = `${rect.width}%`;
    box.style.height = `${rect.height}%`;

    const tint = roomTint(roomId, privateRoomIds);
    if (tint) {
      box.style.boxShadow = `inset 0 0 0 999px ${tint}4d`;
    }

    const label = document.createElement("span");
    label.className = "room-label";
    label.textContent = roomId === "common" ? "客廳" : `${memberName(roomId)}的房間`;
    box.appendChild(label);

    // 固定家具(Kenney.nl 免費美術素材，見 assets/sprites/furniture)
    if (roomId === "common") {
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
    } else {
      const bed = document.createElement("img");
      bed.className = "furniture furniture-bed";
      bed.src = "assets/sprites/furniture/bedSingle_SE.png";
      bed.alt = "";
      box.appendChild(bed);
    }

    if (roomId !== "common") {
      const decorations = roomDecorations(roomId);
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
    }

    mapEl.appendChild(box);
  });

  const byRoom = {};
  members.forEach((m) => {
    const room = rects[m.currentRoomId] ? m.currentRoomId : "common";
    (byRoom[room] = byRoom[room] || []).push(m);
  });

  Object.entries(byRoom).forEach(([roomId, roomMembers]) => {
    const rect = rects[roomId];
    const centerLeft = rect.left + rect.width / 2;
    const centerTop = rect.top + rect.height / 2;
    const spacing = 9;
    const startOffset = -((roomMembers.length - 1) * spacing) / 2;

    roomMembers.forEach((member, index) => {
      const isVisitorMember = member.role === "visitor";
      const avatar = document.createElement("div");
      avatar.className = `avatar status-${member.status || "offline"}${isVisitorMember ? " avatar-visitor" : ""}`;
      avatar.style.left = `${centerLeft + startOffset + index * spacing}%`;
      avatar.style.top = `${centerTop}%`;
      avatar.textContent = member.displayName ? member.displayName.slice(0, 2) : "?";
      avatar.title = `${member.displayName || "?"}${isVisitorMember ? "（訪客）" : ""} ${member.mood || ""}`;
      mapEl.appendChild(avatar);
    });
  });
}

function renderRoomActions() {
  const members = store.get("members") || [];
  const myKnock = myOutgoingKnock();
  const isVisitor = myRole() === "visitor";
  roomActionsEl.innerHTML = "";
  roomActionsEl.className = "map-hud-bottom room-switcher";

  const commonBtn = document.createElement("button");
  commonBtn.textContent = "客廳(公共區)";
  commonBtn.addEventListener("click", () => updateCurrentRoom(dormId, currentUid, "common"));
  roomActionsEl.appendChild(commonBtn);

  // 訪客沒有自己的房間、也不能敲別人的門（只能待在客廳看看）
  if (isVisitor) return;

  const ownRoomBtn = document.createElement("button");
  ownRoomBtn.textContent = "我的房間";
  ownRoomBtn.addEventListener("click", () => updateCurrentRoom(dormId, currentUid, currentUid));
  roomActionsEl.appendChild(ownRoomBtn);

  members
    .filter((m) => m.id !== currentUid && m.role !== "visitor")
    .forEach((member) => {
      const btn = document.createElement("button");
      const isPendingThisRoom = myKnock && myKnock.roomId === member.id && myKnock.status === "pending";
      btn.textContent = isPendingThisRoom ? `已敲 ${member.displayName} 的門...` : `敲 ${member.displayName} 的門`;
      btn.disabled = isPendingThisRoom;
      btn.addEventListener("click", () => {
        requestKnock(dormId, member.id, currentUid, memberName(currentUid));
      });
      roomActionsEl.appendChild(btn);
    });
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
    updateCurrentRoom(dormId, currentUid, status.roomId);
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
