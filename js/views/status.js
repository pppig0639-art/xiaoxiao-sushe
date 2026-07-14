// 狀態控制：上線時自動標記 online，分頁切走/關閉時標記 offline，
// 另外提供一個下拉選單讓使用者手動標記 busy / sleeping（這兩種沒辦法自動偵測）。
// sleeping 狀態還會蓋一個全螢幕的睡覺遮罩，直到點一下畫面或狀態被改掉才消失。

import * as store from "../store.js";
import { updateStatus } from "../db/members.js";

let dormId = null;
let currentUid = null;
let selectEl = null;
let sleepOverlayEl = null;

export function initStatusControl(_dormId, uid) {
  dormId = _dormId;
  currentUid = uid;
  selectEl = document.getElementById("status-select");
  sleepOverlayEl = document.getElementById("sleep-overlay");

  updateStatus(dormId, currentUid, "online");

  selectEl.addEventListener("change", () => {
    updateStatus(dormId, currentUid, selectEl.value);
  });

  sleepOverlayEl.addEventListener("click", () => {
    selectEl.value = "online";
    updateStatus(dormId, currentUid, "online");
  });

  store.subscribe("members", (members) => {
    const me = members.find((m) => m.id === currentUid);
    const sleeping = !!me && me.status === "sleeping";
    sleepOverlayEl.hidden = !sleeping;
    if (sleeping) selectEl.value = "sleeping";
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
