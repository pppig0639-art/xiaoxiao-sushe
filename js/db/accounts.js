// 個人帳號 profile（accounts/{uid}，uid 就是 Firebase Auth email/password 帳號的 uid）。

import { db } from "../firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function getAccount(uid) {
  const snap = await getDoc(doc(db, "accounts", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function createAccount(uid, { displayName, email }) {
  return setDoc(doc(db, "accounts", uid), {
    displayName,
    email,
    currentDormId: null,
    createdAt: serverTimestamp(),
  });
}

export function setCurrentDorm(uid, dormId) {
  return updateDoc(doc(db, "accounts", uid), { currentDormId: dormId });
}
