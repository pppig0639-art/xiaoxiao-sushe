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
      hunger: 80,
      moodValue: 80,
      lastInteractionAt: new Date(),
      interactionLog: [],
    });
  }
}

function logInteraction(dormId, uid, action) {
  return updateDoc(doc(db, "dorms", dormId, "pet", PET_DOC_ID), {
    lastInteractionAt: new Date(),
    interactionLog: arrayUnion({ uid, action, timestamp: new Date() }),
  });
}

async function bumpStat(dormId, field, delta) {
  const ref = doc(db, "dorms", dormId, "pet", PET_DOC_ID);
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data()[field] || 0 : 0;
  const next = Math.max(0, Math.min(100, current + delta));
  await updateDoc(ref, { [field]: next });
}

export async function feed(dormId, uid) {
  await bumpStat(dormId, "hunger", 10);
  await logInteraction(dormId, uid, "feed");
}

export async function play(dormId, uid) {
  await bumpStat(dormId, "moodValue", 10);
  await logInteraction(dormId, uid, "play");
}
