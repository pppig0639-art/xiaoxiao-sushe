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

export function postMessage(dormId, content, authorUid) {
  return addDoc(collection(db, "dorms", dormId, "messages"), {
    content,
    authorUid,
    createdAt: serverTimestamp(),
  });
}
