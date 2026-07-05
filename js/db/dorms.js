// dorms/{dormId} 本體：建立寢室、用代碼查詢、加入。

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function randomDormCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createDorm({ name, capacity, dormPassword, ownerUid, mode }) {
  const dormCode = randomDormCode();
  const ref = await addDoc(collection(db, "dorms"), {
    name,
    capacity,
    dormCode,
    dormPassword,
    ownerUid,
    mode, // "shared" | "personal"
    memberUids: [ownerUid],
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, dormCode };
}

export async function findDormByCode(dormCode) {
  const q = query(collection(db, "dorms"), where("dormCode", "==", dormCode));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getDorm(dormId) {
  const snap = await getDoc(doc(db, "dorms", dormId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function joinDorm(dormId, uid) {
  return updateDoc(doc(db, "dorms", dormId), { memberUids: arrayUnion(uid) });
}
