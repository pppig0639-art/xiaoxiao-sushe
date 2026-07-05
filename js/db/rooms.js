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
  deleteField,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import * as store from "../store.js";

let unsubscribeRooms = null;
let unsubscribeIncomingKnocks = null;

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
    decorations: [],
  });
}

export function updateDecorations(dormId, uid, decorations) {
  return updateDoc(doc(db, "dorms", dormId, "rooms", uid), { decorations });
}

export function createCommonRoom(dormId) {
  return setDoc(doc(db, "dorms", dormId, "rooms", "common"), {
    type: "common",
    ownerUid: null,
  });
}

// --- 敲門 ---
// 敲門結果同時鏡射寫一份到「敲門者自己的 members 文件」上（outgoingKnock 欄位），
// 這樣敲門者只要訂閱本來就在聽的 members 資料就能看到結果，不需要額外用 collection group
// 查詢「我敲過的所有門」—— 省掉一個要另外設定 Firestore 索引的麻煩。

export function requestKnock(dormId, roomId, requesterUid, requesterName) {
  return Promise.all([
    setDoc(doc(db, "dorms", dormId, "rooms", roomId, "knocks", requesterUid), {
      requesterUid,
      requesterName,
      status: "pending",
      createdAt: serverTimestamp(),
    }),
    updateDoc(doc(db, "dorms", dormId, "members", requesterUid), {
      outgoingKnock: { roomId, status: "pending" },
    }),
  ]);
}

export function respondToKnock(dormId, roomId, requesterUid, approve) {
  const status = approve ? "approved" : "denied";
  return Promise.all([
    updateDoc(doc(db, "dorms", dormId, "rooms", roomId, "knocks", requesterUid), {
      status,
      respondedAt: serverTimestamp(),
    }),
    updateDoc(doc(db, "dorms", dormId, "members", requesterUid), {
      outgoingKnock: { roomId, status },
    }),
  ]);
}

export function deleteKnock(dormId, roomId, requesterUid) {
  return Promise.all([
    deleteDoc(doc(db, "dorms", dormId, "rooms", roomId, "knocks", requesterUid)),
    updateDoc(doc(db, "dorms", dormId, "members", requesterUid), {
      outgoingKnock: deleteField(),
    }),
  ]);
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
