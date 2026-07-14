// dorms/{dormId}/messages：留言板。

import { db } from "../firebase-config.js";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import * as store from "../store.js";

let unsubscribe = null;

export function listenMessages(dormId) {
  if (unsubscribe) return;
  const q = query(collection(db, "dorms", dormId, "messages"), orderBy("createdAt", "desc"));
  unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    store.set("messages", messages);
  });
}

export function stopListeningMessages() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// channel 是 "public"(大家都看得到) 或兩人的悄悄話(見 dmChannelId)。
// 訊息還是全部存在同一個 collection、一次撈全部，畫面上再依 channel 篩選要顯示哪些 ——
// 訊息量對一個小寢室來說很少，不需要為了分頻道另外開 Firestore 索引查詢。
// 悄悄話一定要帶 participants(兩個 uid)，真正的隱私是靠 firestore.rules 檔案裡
// 「只有 participants 裡的人可以讀」擋住的，不是只靠畫面上篩選頻道。
export function postMessage(dormId, content, authorUid, channel = "public", participants = null) {
  const data = { content, authorUid, channel, createdAt: serverTimestamp() };
  if (participants) data.participants = participants;
  return addDoc(collection(db, "dorms", dormId, "messages"), data);
}

// 兩人悄悄話的頻道 id，不管是誰跟誰講、順序怎麼排，算出來都一樣
export function dmChannelId(uidA, uidB) {
  return `dm:${[uidA, uidB].sort().join("_")}`;
}
