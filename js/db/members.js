// dorms/{dormId}/members/{uid}：取代 v1 的 db/users.js。

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import * as store from "../store.js";

let unsubscribe = null;

export function listenMembers(dormId) {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(collection(db, "dorms", dormId, "members"), (snapshot) => {
    const members = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    store.set("members", members);
  });
}

export function stopListeningMembers() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export function createMemberDoc(dormId, uid, displayName) {
  return setDoc(doc(db, "dorms", dormId, "members", uid), {
    displayName,
    role: "member",
    currentRoomId: "common",
    status: "offline",
    activity: "idle",
    mood: "",
    lastActiveAt: new Date(),
    taskCompletedCount: 0,
  });
}

// 訪客沒有自己的房間、不用做家事，永遠待在客廳
export function createVisitorMemberDoc(dormId, uid, displayName) {
  return setDoc(doc(db, "dorms", dormId, "members", uid), {
    displayName,
    role: "visitor",
    currentRoomId: "common",
    status: "offline",
    activity: "idle",
    mood: "",
    lastActiveAt: new Date(),
    taskCompletedCount: 0,
  });
}

export async function getMember(dormId, uid) {
  const snap = await getDoc(doc(db, "dorms", dormId, "members", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function updateStatus(dormId, uid, status) {
  return updateDoc(doc(db, "dorms", dormId, "members", uid), { status, lastActiveAt: new Date() });
}

export function updateActivity(dormId, uid, activity) {
  return updateDoc(doc(db, "dorms", dormId, "members", uid), { activity });
}

export function updateCurrentRoom(dormId, uid, roomId) {
  return updateDoc(doc(db, "dorms", dormId, "members", uid), { currentRoomId: roomId });
}

export function updateAvatarChoice(dormId, uid, avatarId) {
  return updateDoc(doc(db, "dorms", dormId, "members", uid), { avatarChoice: avatarId });
}

export function incrementTaskCompleted(dormId, uid, delta = 1) {
  return updateDoc(doc(db, "dorms", dormId, "members", uid), {
    taskCompletedCount: increment(delta),
  });
}
