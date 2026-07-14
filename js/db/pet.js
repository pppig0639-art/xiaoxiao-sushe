// dorms/{dormId}/pet/shared：一個寢室共養一隻。

import { db } from "../firebase-config.js";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import * as store from "../store.js";

const PET_DOC_ID = "shared";

// 飽腹值/心情值不是存一個固定數字然後靠人手動扣，而是存「上次餵食/互動的時間」，
// 畫面顯示時用經過的時間現算現在應該剩多少 —— 這樣數值才會自己隨時間往下掉，
// 不用寫一個永遠在背景跑的計時器/雲端函式。
export const HUNGER_DECAY_PER_HOUR = 4;
export const MOOD_DECAY_PER_HOUR = 3;

export const PET_SPECIES = [
  { id: "dog", label: "小狗", emoji: "🐶" },
  { id: "cat", label: "小貓", emoji: "🐱" },
  { id: "rabbit", label: "兔兔", emoji: "🐰" },
  { id: "hamster", label: "倉鼠", emoji: "🐹" },
  { id: "bird", label: "小鳥", emoji: "🐦" },
];

function toDate(value) {
  if (!value) return null;
  return typeof value.toDate === "function" ? value.toDate() : new Date(value);
}

export function decayedValue(base, sinceTimestamp, ratePerHour) {
  const since = toDate(sinceTimestamp);
  if (!since) return base;
  const hours = Math.max(0, (Date.now() - since.getTime()) / 3600000);
  return Math.max(0, Math.min(100, Math.round(base - hours * ratePerHour)));
}

let unsubscribe = null;

export function listenPet(dormId) {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(doc(db, "dorms", dormId, "pet", PET_DOC_ID), (snap) => {
    store.set("pet", snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function stopListeningPet() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export async function ensurePetExists(dormId) {
  const ref = doc(db, "dorms", dormId, "pet", PET_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: "小福",
      species: "dog",
      hunger: 80,
      moodValue: 80,
      lastFedAt: new Date(),
      lastPlayedAt: new Date(),
      interactionLog: [],
    });
  }
}

function logInteraction(dormId, uid, action) {
  return updateDoc(doc(db, "dorms", dormId, "pet", PET_DOC_ID), {
    interactionLog: arrayUnion({ uid, action, timestamp: new Date() }),
  });
}

async function bumpStat(dormId, field, timeField, ratePerHour, delta) {
  const ref = doc(db, "dorms", dormId, "pet", PET_DOC_ID);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const current = decayedValue(data[field] ?? 80, data[timeField], ratePerHour);
  const next = Math.max(0, Math.min(100, current + delta));
  await updateDoc(ref, { [field]: next, [timeField]: new Date() });
}

export async function feed(dormId, uid) {
  await bumpStat(dormId, "hunger", "lastFedAt", HUNGER_DECAY_PER_HOUR, 25);
  await logInteraction(dormId, uid, "feed");
}

export async function play(dormId, uid) {
  await bumpStat(dormId, "moodValue", "lastPlayedAt", MOOD_DECAY_PER_HOUR, 20);
  await logInteraction(dormId, uid, "play");
}

export function renamePet(dormId, name) {
  return updateDoc(doc(db, "dorms", dormId, "pet", PET_DOC_ID), { name });
}

export function setPetSpecies(dormId, species) {
  return updateDoc(doc(db, "dorms", dormId, "pet", PET_DOC_ID), { species });
}
