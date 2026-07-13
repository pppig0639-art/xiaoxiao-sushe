// 主應用進入點。
// 身分完全交給 Firebase Auth（onAuthStateChanged）判斷，不再像 v1 那樣另外存一份 localStorage 旗標，
// 這樣就不會有「localStorage 說有登入，但 Firebase session 其實過期/不是同一個人」的落差。

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getAccount } from "./db/accounts.js";
import { getDorm } from "./db/dorms.js";

import { listenMembers, getMember } from "./db/members.js";
import { listenRooms, listenIncomingKnocks } from "./db/rooms.js";
import { listenDuties } from "./db/duties.js";
import { listenMessages } from "./db/messages.js";
import { listenPet, ensurePetExists } from "./db/pet.js";

import { initMapView } from "./views/map.js";
import { initDutiesView } from "./views/duties.js";
import { initMessagesView } from "./views/messages.js";
import { initPetView } from "./views/pet.js";
import { initStatusControl, markOffline } from "./views/status.js";
import { initAmbienceControl } from "./views/ambience.js";
import { initDecorationsView } from "./views/decorations.js";

const currentUserNameEl = document.getElementById("current-user-name");
const dormNameEl = document.getElementById("dorm-name");
const logoutBtn = document.getElementById("logout-btn");
const tabButtons = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".app-view");

function switchTab(viewId) {
  views.forEach((v) => (v.hidden = v.id !== viewId));
  tabButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === viewId));
}

function initTabBar() {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.view));
  });
}

async function bootstrap(user) {
  const account = await getAccount(user.uid);
  if (!account) {
    window.location.href = "login.html";
    return;
  }
  if (!account.currentDormId) {
    window.location.href = "dorm-select.html";
    return;
  }

  const dormId = account.currentDormId;
  const dorm = await getDorm(dormId);

  const member = await getMember(dormId, user.uid);
  const isVisitor = member && member.role === "visitor";
  currentUserNameEl.textContent = account.displayName + (isVisitor ? "（訪客）" : "");
  dormNameEl.textContent = dorm ? `${dorm.name}（代碼 ${dorm.dormCode}）` : "";

  await ensurePetExists(dormId);

  listenMembers(dormId);
  listenRooms(dormId);
  listenDuties(dormId);
  listenMessages(dormId);
  listenPet(dormId);
  listenIncomingKnocks(dormId, user.uid);

  initMapView(dormId, user.uid);
  initDutiesView(dormId, dorm ? dorm.mode : "shared");
  initMessagesView(dormId, user.uid);
  initPetView(dormId, user.uid);
  initStatusControl(dormId, user.uid);
  initAmbienceControl();
  initDecorationsView(dormId, user.uid);
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  bootstrap(user);
});

logoutBtn.addEventListener("click", async () => {
  markOffline();
  await signOut(auth);
  window.location.href = "login.html";
});

initTabBar();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.error("[app] service worker registration failed", err);
    });
  });
}
