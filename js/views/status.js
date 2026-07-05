// 狀態控制：上線時自動標記 online，分頁切走/關閉時標記 offline，
// 另外提供一個下拉選單讓使用者手動標記 busy / sleeping（這兩種沒辦法自動偵測）。

import { updateStatus } from "../db/members.js";

let dormId = null;
let currentUid = null;
let selectEl = null;

export function initStatusControl(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  selectEl = document.getElementById("status-select");

  updateStatus(dormId, currentUid, "online");

  selectEl.addEventListener("change", () => {
    updateStatus(dormId, currentUid, selectEl.value);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      updateStatus(dormId, currentUid, "offline");
    } else {
      selectEl.value = "online";
      updateStatus(dormId, currentUid, "online");
    }
  });
}

export function markOffline() {
  if (dormId && currentUid) {
    updateStatus(dormId, currentUid, "offline");
  }
}
