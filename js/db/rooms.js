// dorms/{dormId}/rooms/{roomId}：roomId 是 "common" 或某成員的 uid(=他的私人房間)。
// 進私人房間要「敲門」，房主同意/拒絕，不做成永久白名單 —— 每次都是一次性的請求。

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import * as store from "../store.js";

let unsubscribeRooms = null;
let unsubscribeIncomingKnocks = null;
let unsubscribeMyKnock = null;

export function listenRooms(dormId) {
  if (unsubscribeRooms) return;
  unsubscribeRooms = onSnapshot(collection(db, "dorms", dormId, "rooms"), (snapshot) => {
    const rooms = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    store.set("rooms", rooms);
  });
}

export function stopListeningRooms() {
  if (unsubscribeRooms) {
    unsubscribeRooms();
    unsubscribeRooms = null;
  }
}

export function createOwnRoom(dormId, uid) {
  return setDoc(doc(db, "dorms", dormId, "rooms", uid), {
    type: "private",
    ownerUid: uid,
  });
}

export function createCommonRoom(dormId) {
  return setDoc(doc(db, "dorms", dormId, "rooms", "common"), {
    type: "common",
    ownerUid: null,
  });
}

// --- 敲門 ---

export function requestKnock(dormId, roomId, requesterUid, requesterName) {
  return setDoc(doc(db, "dorms", dormId, "rooms", roomId, "knocks", requesterUid), {
    requesterUid,
    requesterName,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export function respondToKnock(dormId, roomId, requesterUid, approve) {
  return updateDoc(doc(db, "dorms", dormId, "rooms", roomId, "knocks", requesterUid), {
    status: approve ? "approved" : "denied",
    respondedAt: serverTimestamp(),
  });
}

export function deleteKnock(dormId, roomId, requesterUid) {
  return deleteDoc(doc(db, "dorms", dormId, "rooms", roomId, "knocks", requesterUid));
}

// 我自己房間收到的敲門請求（只挑還沒處理的）
export function listenIncomingKnocks(dormId, myUid) {
  if (unsubscribeIncomingKnocks) return;
  const q = query(
    collection(db, "dorms", dormId, "rooms", myUid, "knocks"),
    where("status", "==", "pending")
  );
  unsubscribeIncomingKnocks = onSnapshot(q, (snapshot) => {
    store.set("incomingKnocks", snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function stopListeningIncomingKnocks() {
  if (unsubscribeIncomingKnocks) {
    unsubscribeIncomingKnocks();
    unsubscribeIncomingKnocks = null;
  }
}

// 我敲了別人的門之後，追蹤那一筆的狀態變化
export function listenMyKnockStatus(dormId, targetRoomId, myUid) {
  if (unsubscribeMyKnock) unsubscribeMyKnock();
  unsubscribeMyKnock = onSnapshot(
    doc(db, "dorms", dormId, "rooms", targetRoomId, "knocks", myUid),
    (snap) => {
      store.set("myKnockStatus", snap.exists() ? { roomId: targetRoomId, ...snap.data() } : null);
    }
  );
}

export function stopListeningMyKnock() {
  if (unsubscribeMyKnock) {
    unsubscribeMyKnock();
    unsubscribeMyKnock = null;
  }
}
