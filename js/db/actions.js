// dorms/{dormId}/actions：打招呼/攻擊某個部位等基礎互動動作。
// 是「一閃即逝」的訊號，不是永久紀錄 —— 送出後由發送者自己在幾秒後刪掉，
// 別人只要在畫面上看到就顯示一個飄浮的小泡泡，不需要一直留著。

import { db } from "../firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import * as store from "../store.js";

let unsubscribe = null;

export function listenActions(dormId) {
  if (unsubscribe) return;
  const q = query(collection(db, "dorms", dormId, "actions"), orderBy("createdAt", "desc"), limit(20));
  unsubscribe = onSnapshot(q, (snapshot) => {
    store.set("actions", snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function stopListeningActions() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export async function sendAction(dormId, fromUid, fromName, toUid, actionId) {
  const ref = await addDoc(collection(db, "dorms", dormId, "actions"), {
    fromUid,
    fromName,
    toUid,
    action: actionId,
    createdAt: serverTimestamp(),
  });
  // 送出後幾秒自己清掉，畫面上該看到的人早就看到了，不用留著佔資料庫空間
  setTimeout(() => {
    deleteDoc(doc(db, "dorms", dormId, "actions", ref.id)).catch(() => {});
  }, 4000);
}
