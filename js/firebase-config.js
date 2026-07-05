// Firebase 初始化。
// 開發順序第 1 步：到 https://console.firebase.google.com 建立專案後，
// 「專案設定 > 一般 > 你的應用程式 > SDK 設定與程式碼片段」複製設定值貼到下面。
// 注意：這組 config 會被打包進前端程式碼、對所有訪客可見，這是 Firebase 的正常做法，
// 真正的存取控制要靠 firestore.rules，不是靠隱藏這組 key。

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5QRZVHSOs8HVWl8mzMbaQylbuCEMKbWo",
  authDomain: "littleroom-e2deb.firebaseapp.com",
  projectId: "littleroom-e2deb",
  storageBucket: "littleroom-e2deb.firebasestorage.app",
  messagingSenderId: "824517494759",
  appId: "1:824517494759:web:80c1970df9091022435f42",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
