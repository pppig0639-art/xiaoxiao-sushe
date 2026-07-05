// dorm-select.html 的畫面邏輯：加入既有寢室，或建立新寢室。

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getAccount, setCurrentDorm } from "./db/accounts.js";
import { findDormByCode, createDorm, joinDorm } from "./db/dorms.js";
import { createOwnRoom, createCommonRoom } from "./db/rooms.js";
import { createMemberDoc } from "./db/members.js";

const greetNameEl = document.getElementById("greet-name");
const joinForm = document.getElementById("join-form");
const guestJoinBlockedEl = document.getElementById("guest-join-blocked");
const joinCodeInput = document.getElementById("join-code-input");
const joinPasswordInput = document.getElementById("join-password-input");
const createForm = document.getElementById("create-form");
const createNameInput = document.getElementById("create-name-input");
const capacityField = document.getElementById("capacity-field");
const createCapacitySelect = document.getElementById("create-capacity-select");
const createPasswordInput = document.getElementById("create-password-input");
const errorEl = document.getElementById("dorm-error");
const logoutBtn = document.getElementById("logout-btn");
const modeSharedBtn = document.getElementById("mode-shared-btn");
const modePersonalBtn = document.getElementById("mode-personal-btn");

let currentUid = null;
let currentDisplayName = "";
let createMode = "shared"; // "shared" | "personal"

function setCreateMode(mode) {
  createMode = mode;
  modeSharedBtn.classList.toggle("is-active", mode === "shared");
  modePersonalBtn.classList.toggle("is-active", mode === "personal");
  capacityField.hidden = mode === "personal";
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

async function afterJoinOrCreate(dormId) {
  await setCurrentDorm(currentUid, dormId);
  window.location.href = "app.html";
}

async function handleJoin(e) {
  e.preventDefault();
  showError("");
  const code = joinCodeInput.value.trim();
  const password = joinPasswordInput.value;

  try {
    const dorm = await findDormByCode(code);
    if (!dorm) {
      showError("找不到這個寢室代碼，確認一下有沒有打錯");
      return;
    }
    if (dorm.dormPassword !== password) {
      showError("密碼不對喔");
      return;
    }
    if (!dorm.memberUids.includes(currentUid) && dorm.memberUids.length >= dorm.capacity) {
      showError("這個寢室已經滿了");
      return;
    }

    if (!dorm.memberUids.includes(currentUid)) {
      await joinDorm(dorm.id, currentUid);
      await createMemberDoc(dorm.id, currentUid, currentDisplayName);
      await createOwnRoom(dorm.id, currentUid);
    }
    await afterJoinOrCreate(dorm.id);
  } catch (err) {
    console.error("[dorm-select] join failed", err);
    showError("加入失敗，請檢查網路後再試一次");
  }
}

async function handleCreate(e) {
  e.preventDefault();
  showError("");
  const name = createNameInput.value.trim();
  const capacity = createMode === "personal" ? 1 : Number(createCapacitySelect.value);
  const password = createPasswordInput.value;

  try {
    const { id } = await createDorm({
      name,
      capacity,
      dormPassword: password,
      ownerUid: currentUid,
      mode: createMode,
    });
    await createMemberDoc(id, currentUid, currentDisplayName);
    await createOwnRoom(id, currentUid);
    await createCommonRoom(id);
    // 寢室代碼進到 app.html 後，會顯示在畫面最上面，室友加入要用那組代碼 + 你剛設定的密碼
    await afterJoinOrCreate(id);
  } catch (err) {
    console.error("[dorm-select] create failed", err);
    showError("建立失敗，請檢查網路後再試一次");
  }
}

joinForm.addEventListener("submit", handleJoin);
createForm.addEventListener("submit", handleCreate);
modeSharedBtn.addEventListener("click", () => setCreateMode("shared"));
modePersonalBtn.addEventListener("click", () => setCreateMode("personal"));

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUid = user.uid;
  const account = await getAccount(user.uid);
  if (!account) {
    // 理論上註冊流程一定會建立 account，這裡是防呆
    window.location.href = "login.html";
    return;
  }
  if (account.currentDormId) {
    window.location.href = "app.html";
    return;
  }
  currentDisplayName = account.displayName;
  greetNameEl.textContent = account.displayName;

  if (user.isAnonymous) {
    joinForm.hidden = true;
    guestJoinBlockedEl.hidden = false;
  }
});
