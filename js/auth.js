// v2 登入頁（login.html）：個人帳號用 Email + 密碼，取代 v1 的選名字+PIN。
// 這裡不需要像 v1 auth.js 那樣先讀 Firestore 才能顯示畫面，
// 所以完全沒有「登入頁自己都讀不到資料」那種雞生蛋問題。

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getAccount, createAccount } from "./db/accounts.js";

const modeLoginBtn = document.getElementById("mode-login-btn");
const modeRegisterBtn = document.getElementById("mode-register-btn");
const displayNameInput = document.getElementById("display-name-input");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const authForm = document.getElementById("auth-form");
const authSubmitBtn = document.getElementById("auth-submit");
const errorEl = document.getElementById("auth-error");
const googleLoginBtn = document.getElementById("google-login-btn");
const guestLoginBtn = document.getElementById("guest-login-btn");

let mode = "login"; // "login" | "register"

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "這個 Email 已經註冊過了，改用登入試試",
  "auth/invalid-email": "Email 格式怪怪的",
  "auth/weak-password": "密碼太簡單了，至少要 6 碼",
  "auth/invalid-credential": "Email 或密碼不對",
  "auth/wrong-password": "Email 或密碼不對",
  "auth/user-not-found": "找不到這個帳號，要不要先註冊？",
};

function setMode(newMode) {
  mode = newMode;
  modeLoginBtn.classList.toggle("is-active", mode === "login");
  modeRegisterBtn.classList.toggle("is-active", mode === "register");
  displayNameInput.hidden = mode !== "register";
  displayNameInput.required = mode === "register";
  authSubmitBtn.textContent = mode === "register" ? "註冊" : "登入";
  showError("");
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

async function redirectAfterAuth(user) {
  let account = await getAccount(user.uid);
  if (!account) {
    // Google/訪客登入沒有另外的「註冊」步驟，第一次登入就直接建帳號
    await createAccount(user.uid, {
      displayName: user.displayName || user.email || "訪客",
      email: user.email || null,
    });
    account = await getAccount(user.uid);
  }
  if (account && account.currentDormId) {
    window.location.href = "app.html";
  } else {
    window.location.href = "dorm-select.html";
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    if (mode === "register") {
      const displayName = displayNameInput.value.trim();
      if (!displayName) {
        showError("先取個暱稱吧");
        return;
      }
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await createAccount(credential.user.uid, { displayName, email });
      window.location.href = "dorm-select.html";
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await redirectAfterAuth(credential.user);
    }
  } catch (err) {
    console.error("[auth]", err);
    showError(ERROR_MESSAGES[err.code] || "登入失敗，請檢查網路後再試一次");
  }
}

async function handleGoogleLogin() {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await redirectAfterAuth(credential.user);
  } catch (err) {
    console.error("[auth] google login failed", err);
    showError("Google 登入失敗，請再試一次");
  }
}

async function handleGuestLogin() {
  try {
    const credential = await signInAnonymously(auth);
    await redirectAfterAuth(credential.user);
  } catch (err) {
    console.error("[auth] guest login failed", err);
    showError("訪客登入失敗，請再試一次");
  }
}

modeLoginBtn.addEventListener("click", () => setMode("login"));
modeRegisterBtn.addEventListener("click", () => setMode("register"));
authForm.addEventListener("submit", handleSubmit);
googleLoginBtn.addEventListener("click", handleGoogleLogin);
guestLoginBtn.addEventListener("click", handleGuestLogin);

// 如果瀏覽器本來就還留著登入狀態，直接往下一步跳，不用再填一次表單。
// 只處理「一進頁面就發現的狀態」，用完馬上取消訂閱 —
// 否則等一下註冊/登入表單自己觸發的那次 auth 狀態變化也會被這裡搶著處理，
// 跟 handleSubmit 自己的建帳號/導頁邏輯打架（跑出「暱稱被 email 蓋掉」這種競速問題）。
const unsubscribeInitialAuthCheck = onAuthStateChanged(auth, (user) => {
  unsubscribeInitialAuthCheck();
  if (user) redirectAfterAuth(user);
});
