// dorms/{dormId}/duties：輪值提醒。

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import * as store from "../store.js";
import { incrementTaskCompleted } from "./members.js";

let unsubscribe = null;

export function listenDuties(dormId) {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(collection(db, "dorms", dormId, "duties"), (snapshot) => {
    const duties = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    store.set("duties", duties);
  });
}

export function stopListeningDuties() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export async function markDone(dormId, dutyId, assignedUid, isCompleted = true) {
  await updateDoc(doc(db, "dorms", dormId, "duties", dutyId), { isCompleted });
  if (isCompleted) {
    await incrementTaskCompleted(dormId, assignedUid, 1);
  } else {
    await incrementTaskCompleted(dormId, assignedUid, -1);
  }
}

export function createDuty(dormId, { cycleType, taskName, assignedUid, date }) {
  return addDoc(collection(db, "dorms", dormId, "duties"), {
    cycleType,
    taskName,
    assignedUid,
    date,
    isCompleted: false,
  });
}

// Phase B 用：挑目前 taskCompletedCount 最小的成員來指派
export function pickFairestAssignee(members) {
  if (members.length === 0) return null;
  const minCount = Math.min(...members.map((m) => m.taskCompletedCount || 0));
  const candidates = members.filter((m) => (m.taskCompletedCount || 0) === minCount);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
